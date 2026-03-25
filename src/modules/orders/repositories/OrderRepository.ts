import { Knex } from "knex";
import { CreateOrderRequest, OrderLineItem, OrderPayment, CreateOrderResponse } from "../../../shared/types/retailer-ordering";

export class OrderRepository {
  constructor(private db: Knex) {}

  /**
   * Create order with line items (transaction)
   */
  async createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.db.transaction(async (trx) => {
      // Check for duplicate submission (idempotency)
      const existing = await trx("orders")
        .where("idempotency_key", data.idempotency_key)
        .first();

      if (existing) {
        return {
          order_id: existing.id,
          order_number: existing.order_number,
          status: existing.status,
          total_amount: existing.total_amount,
          line_item_count: Number((await trx("order_line_items").where("order_id", existing.id).count("* as count").first())?.count || 0),
          created_at: existing.created_at,
          confirmation_token: existing.confirmation_token || "token",
        };
      }

      // Calculate total and validate products
      let totalAmount = 0;
      const lineItems: any[] = [];

      for (const item of data.line_items) {
        // Get product price from tenant_products
        const product = await trx("tenant_products")
          .where({
            id: item.product_id,
            tenant_id: data.tenant_id,
          })
          .select("base_price", "advance_price")
          .first();

        if (!product) {
          throw new Error(`Product ${item.product_id} not found for tenant`);
        }

        const unitPrice = data.payment_type === "advance" ? product.advance_price || product.base_price : product.base_price;
        const lineTotal = unitPrice * item.quantity;

        lineItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        });

        totalAmount += lineTotal;
      }

      // Validate minimum order value (₹1500)
      // TODO_IMPLEMENTATION_REQUIRED: Move to routing module as configurable rule
      // Blocked on: Routing module implementation
      // Expected: Call routingService.validateMinOrderValue(tenantId, totalAmount)
      if (totalAmount < 1500) {
        throw new Error("Minimum order value is ₹1500");
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;

      // Create order
      const [orderId] = await trx("orders").insert({
        tenant_id: data.tenant_id,
        retailer_id: data.retailer_id,
        order_number: orderNumber,
        total_amount: totalAmount,
        status: "pending_approval",
        idempotency_key: data.idempotency_key,
        metadata: data.metadata,
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });

      // Insert line items
      await trx("order_line_items").insert(
        lineItems.map((item) => ({
          ...item,
          order_id: orderId,
          created_at: this.db.fn.now(),
          updated_at: this.db.fn.now(),
        }))
      );

      // Insert payment record
      await trx("order_payments").insert({
        order_id: orderId,
        payment_type: data.payment_type,
        amount: totalAmount,
        payment_status: "pending",
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });

      // Generate confirmation token for WhatsApp notification
      const confirmationToken = `CONFIRM-${orderId}-${Date.now()}`;

      // Update with confirmation token
      await trx("orders")
        .where({ id: orderId })
        .update({ confirmation_token: confirmationToken });

      return {
        order_id: orderId,
        order_number: orderNumber,
        status: "pending_approval",
        total_amount: totalAmount,
        line_item_count: lineItems.length,
        created_at: new Date().toISOString(),
        confirmation_token: confirmationToken,
      };
    });
  }

  /**
   * Get order details with line items
   */
  async getOrder(orderId: number) {
    const order = await this.db("orders")
      .where({ id: orderId })
      .first();

    if (!order) return null;

    const lineItems = await this.db("order_line_items")
      .join("tenant_products", "order_line_items.product_id", "tenant_products.id")
      .where("order_line_items.order_id", orderId)
      .select(
        "order_line_items.*",
        "tenant_products.name",
        "tenant_products.pack_size",
        "tenant_products.sku"
      );

    const payment = await this.db("order_payments")
      .where({ order_id: orderId })
      .first();

    return {
      ...order,
      line_items: lineItems,
      payment,
    };
  }

  /**
   * Get recent orders for retailer on a tenant
   */
  async getRetailerOrders(retailerId: number, tenantId: number, limit = 20) {
    return this.db("orders")
      .where({
        retailer_id: retailerId,
        tenant_id: tenantId,
      })
      .orderBy("created_at", "desc")
      .limit(limit)
      .select("id", "order_number", "status", "total_amount", "created_at");
  }

  /**
   * Get quick reorder data for retailer
   */
  async getQuickReorderData(retailerId: number, tenantId: number) {
    // Recent items (last 5 orders)
    const recentItems = await this.db("order_line_items")
      .join("orders", "order_line_items.order_id", "orders.id")
      .join("tenant_products", "order_line_items.product_id", "tenant_products.id")
      .where({
        "orders.retailer_id": retailerId,
        "orders.tenant_id": tenantId,
      })
      .orderBy("orders.created_at", "desc")
      .limit(5)
      .select(
        "tenant_products.id as product_id",
        "tenant_products.sku",
        "tenant_products.name",
        "tenant_products.pack_size",
        "tenant_products.base_price",
        "order_line_items.quantity as quantity_last_ordered",
        "orders.created_at as last_order_date"
      );

    // Frequently ordered (top 3 by frequency)
    const frequentItems = await this.db("order_line_items")
      .join("orders", "order_line_items.order_id", "orders.id")
      .join("tenant_products", "order_line_items.product_id", "tenant_products.id")
      .where({
        "orders.retailer_id": retailerId,
        "orders.tenant_id": tenantId,
      })
      .groupBy("tenant_products.id")
      .orderByRaw("COUNT(*) DESC")
      .limit(3)
      .select(
        "tenant_products.id as product_id",
        "tenant_products.sku",
        "tenant_products.name",
        "tenant_products.pack_size",
        "tenant_products.base_price",
        this.db.raw("AVG(order_line_items.quantity) as quantity_last_ordered"),
        this.db.raw("MAX(orders.created_at) as last_order_date")
      );

    return {
      recent_items: recentItems,
      frequently_ordered: frequentItems,
      // TODO_IMPLEMENTATION_REQUIRED: Refill logic based on stock levels
      // Blocked on: Inventory module thresholds + routing module min order rules
      // Expected: Query inventory snapshots, identify low-stock items, calculate refill quantities
      suggested_refills: [], // PLACEHOLDER: Empty until inventory/routing modules complete
    };
  }
}
