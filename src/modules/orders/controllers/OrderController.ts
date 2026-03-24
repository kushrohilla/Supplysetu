import { Request, Response } from "express";
import { Knex } from "knex";
import { OrderRepository } from "../repositories/OrderRepository";
import { CreateOrderRequest } from "../../../shared/types/retailer-ordering";

export class OrderController {
  private orderRepo: OrderRepository;

  constructor(private db: Knex) {
    this.orderRepo = new OrderRepository(db);
  }

  /**
   * POST /orders/retailer/quick-reorder
   * Get data for quick reorder screen
   */
  async getQuickReorderData(req: Request, res: Response): Promise<void> {
    try {
      const retailerId = (req as any).retailer?.id;
      const { tenant_id } = req.query;

      if (!retailerId || !tenant_id) {
        res.status(400).json({ error: "Missing retailer or tenant" });
        return;
      }

      const data = await this.orderRepo.getQuickReorderData(retailerId, Number(tenant_id));
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reorder data" });
    }
  }

  /**
   * POST /orders/retailer/create
   * Create new order with line items
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const retailerId = (req as any).retailer?.id;
      const body: CreateOrderRequest = req.body;

      if (!retailerId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Validate request
      if (!body.tenant_id || !body.line_items || body.line_items.length === 0) {
        res.status(400).json({ error: "Invalid order data" });
        return;
      }

      if (!["cash", "advance", "credit_tag"].includes(body.payment_type)) {
        res.status(400).json({ error: "Invalid payment type" });
        return;
      }

      // Create order
      const result = await this.orderRepo.createOrder({
        ...body,
        retailer_id: retailerId,
      });

      // Trigger notifications
      // TODO: Emit event for WhatsApp notification
      // TODO: Emit event for inventory reservation

      res.status(201).json(result);
    } catch (error: any) {
      if (error.message.includes("Minimum order value")) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create order" });
      }
    }
  }

  /**
   * GET /orders/retailer/:orderId
   * Get order details
   */
  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const retailerId = (req as any).retailer?.id;
      const { orderId } = req.params;

      if (!retailerId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const order = await this.orderRepo.getOrder(Number(orderId));
      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Verify ownership
      if (order.retailer_id !== retailerId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  }

  /**
   * GET /orders/retailer/list
   * Get retailer's order history
   */
  async getOrderHistory(req: Request, res: Response): Promise<void> {
    try {
      const retailerId = (req as any).retailer?.id;
      const { tenant_id, limit = 20 } = req.query;

      if (!retailerId || !tenant_id) {
        res.status(400).json({ error: "Missing parameters" });
        return;
      }

      const orders = await this.orderRepo.getRetailerOrders(
        retailerId,
        Number(tenant_id),
        Number(limit)
      );

      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order history" });
    }
  }

  /**
   * GET /orders/retailer/:orderId/status
   * Get order status for tracking
   */
  async getOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const retailerId = (req as any).retailer?.id;
      const { orderId } = req.params;

      if (!retailerId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const order = await this.orderRepo.getOrder(Number(orderId));
      if (!order || order.retailer_id !== retailerId) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      res.json({
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        updated_at: order.updated_at,
        payment_status: order.payment?.payment_status || "pending",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order status" });
    }
  }
}
