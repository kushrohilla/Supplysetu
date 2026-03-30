import crypto from "crypto";
import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";
import type { OrderStatus } from "../order/order-status";

type DbExecutor = Knex | Knex.Transaction;

type LinkedRetailerRow = {
  id: string;
  name?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

type DeliveryRouteRow = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  created_at: string | Date;
};

type DeliveryRouteRetailerRow = {
  id: string;
  delivery_route_id: string;
  retailer_id: string;
  retailer_name?: string | null;
  phone?: string | null;
  sequence_no: number | string;
};

type OrderBatchRow = {
  id: string;
  tenant_id: string;
  retailer_id: string;
  retailer_name?: string | null;
  order_number: string;
  status: OrderStatus;
  total_amount: number | string | null;
  created_at: string | Date;
  packed_at?: string | Date | null;
  dispatched_at?: string | Date | null;
  delivered_at?: string | Date | null;
};

type DispatchBatchRow = {
  id: string;
  tenant_id: string;
  delivery_route_id?: string | null;
  route_name?: string | null;
  route_description?: string | null;
  planned_date: string;
  status: string;
  created_at: string | Date;
};

type DispatchBatchOrderRow = {
  order_id: string;
  retailer_id?: string;
  route_stop_id?: string | null;
};

type DispatchBatchOrderStatusRow = {
  order_id: string;
  status: OrderStatus;
};

type CountedRouteRow = DeliveryRouteRow & {
  retailer_count?: string | number;
};

type CountedBatchRow = DispatchBatchRow & {
  order_count?: string | number;
};

type DispatchStopRow = {
  id: string;
  dispatch_route_id: string;
  retailer_id: string;
  retailer_name?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  sequence_no: number | string;
};

type SheetOrderItemRow = {
  order_id: string;
  order_item_id: string;
  product_id: string;
  product_name: string;
  brand_name?: string | null;
  quantity: number | string;
  price: number | string;
  total_price: number | string;
};

export type DispatchRouteRecord = {
  id: string;
  name: string;
  description: string | null;
  retailer_count: number;
  created_at: string;
};

export type DispatchRouteWithRetailersRecord = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  retailers: Array<{
    retailer_id: string;
    retailer_name: string;
    phone: string | null;
    sequence_no: number;
  }>;
};

export type DispatchBatchListRecord = {
  id: string;
  route_name: string;
  delivery_date: string;
  order_count: number;
  status: "PENDING" | "DISPATCHED" | "COMPLETED";
  created_at: string;
};

export type DispatchBatchRecord = DispatchBatchListRecord & {
  route_id: string | null;
  route_description: string | null;
};

export type DeliverySheetRecord = {
  batch: {
    id: string;
    status: "PENDING" | "DISPATCHED" | "COMPLETED";
    delivery_date: string;
    created_at: string;
  };
  route: {
    id: string | null;
    name: string;
    description: string | null;
  };
  retailers: Array<{
    retailer: {
      id: string;
      name: string;
      phone: string | null;
      address_line1: string | null;
      locality: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
    };
    sequence_no: number;
    totals: {
      order_count: number;
      total_value: number;
    };
    orders: Array<{
      id: string;
      order_number: string;
      status: OrderStatus;
      total_amount: number;
      created_at: string;
      packed_at: string | null;
      dispatched_at: string | null;
      delivered_at: string | null;
      items: Array<{
        id: string;
        product_id: string;
        product_name: string;
        brand_name: string | null;
        quantity: number;
        price: number;
        total_price: number;
      }>;
    }>;
  }>;
};

export type CreateRouteInput = {
  tenantId: string;
  name: string;
  description?: string;
  retailerIds: string[];
};

export type CreateDispatchBatchInput = {
  tenantId: string;
  routeId: string;
  deliveryDate: string;
  orderIds: string[];
};

const toIsoString = (value: string | Date) => new Date(value).toISOString();
const toIsoStringOrNull = (value: string | Date | null | undefined) => (value ? new Date(value).toISOString() : null);

export class DispatchRepository extends BaseRepository {
  async listLinkedRetailersByIds(tenantId: string, retailerIds: string[], db: DbExecutor = this.db) {
    if (retailerIds.length === 0) {
      return [];
    }

    return db("retailer_distributor_links")
      .join("retailers", "retailer_distributor_links.retailer_id", "retailers.id")
      .where("retailer_distributor_links.tenant_id", tenantId)
      .whereIn("retailer_distributor_links.retailer_id", retailerIds)
      .andWhere("retailers.is_active", true)
      .select<LinkedRetailerRow[]>(
        "retailers.id",
        "retailers.name",
        "retailers.phone",
        "retailers.address_line1",
        "retailers.locality",
        "retailers.city",
        "retailers.state",
        "retailers.pincode",
      );
  }

  async createRouteWithRetailers(input: CreateRouteInput, db: DbExecutor): Promise<DispatchRouteRecord> {
    const routeId = crypto.randomUUID();
    await db("delivery_routes").insert({
      id: routeId,
      tenant_id: input.tenantId,
      name: input.name,
      description: input.description?.trim() || null,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    await db("delivery_route_retailers").insert(
      input.retailerIds.map((retailerId, index) => ({
        id: crypto.randomUUID(),
        delivery_route_id: routeId,
        tenant_id: input.tenantId,
        retailer_id: retailerId,
        sequence_no: index + 1,
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      })),
    );

    return this.getRouteByIdWithRetailerCount(input.tenantId, routeId, db) as Promise<DispatchRouteRecord>;
  }

  async listRoutes(tenantId: string, db: DbExecutor = this.db): Promise<DispatchRouteRecord[]> {
    const rows = await db("delivery_routes")
      .leftJoin("delivery_route_retailers", "delivery_routes.id", "delivery_route_retailers.delivery_route_id")
      .where("delivery_routes.tenant_id", tenantId)
      .groupBy(
        "delivery_routes.id",
        "delivery_routes.name",
        "delivery_routes.description",
        "delivery_routes.created_at",
      )
      .orderBy("delivery_routes.created_at", "desc")
      .select(
        "delivery_routes.id",
        "delivery_routes.name",
        "delivery_routes.description",
        "delivery_routes.created_at",
      )
      .count<{ retailer_count: string }>({ retailer_count: "delivery_route_retailers.id" }) as CountedRouteRow[];

    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      retailer_count: Number(row.retailer_count ?? 0),
      created_at: toIsoString(row.created_at),
    }));
  }

  async getRouteById(tenantId: string, routeId: string, db: DbExecutor = this.db) {
    const row = await db("delivery_routes")
      .where("tenant_id", tenantId)
      .andWhere("id", routeId)
      .first<DeliveryRouteRow>("id", "tenant_id", "name", "description", "created_at");

    return row ?? null;
  }

  async getRouteByIdWithRetailerCount(tenantId: string, routeId: string, db: DbExecutor = this.db): Promise<DispatchRouteRecord | null> {
    const row = await db("delivery_routes")
      .leftJoin("delivery_route_retailers", "delivery_routes.id", "delivery_route_retailers.delivery_route_id")
      .where("delivery_routes.tenant_id", tenantId)
      .andWhere("delivery_routes.id", routeId)
      .groupBy(
        "delivery_routes.id",
        "delivery_routes.name",
        "delivery_routes.description",
        "delivery_routes.created_at",
      )
      .first(
        "delivery_routes.id",
        "delivery_routes.name",
        "delivery_routes.description",
        "delivery_routes.created_at",
      )
      .count<{ retailer_count: string }>({ retailer_count: "delivery_route_retailers.id" }) as CountedRouteRow | undefined;

    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      retailer_count: Number(row.retailer_count ?? 0),
      created_at: toIsoString(row.created_at),
    };
  }

  async getRouteWithRetailers(tenantId: string, routeId: string, db: DbExecutor = this.db): Promise<DispatchRouteWithRetailersRecord | null> {
    const route = await this.getRouteById(tenantId, routeId, db);
    if (!route) {
      return null;
    }

    const retailers = await db("delivery_route_retailers")
      .join("retailers", "delivery_route_retailers.retailer_id", "retailers.id")
      .where("delivery_route_retailers.tenant_id", tenantId)
      .andWhere("delivery_route_retailers.delivery_route_id", routeId)
      .orderBy("delivery_route_retailers.sequence_no", "asc")
      .select<DeliveryRouteRetailerRow[]>(
        "delivery_route_retailers.id",
        "delivery_route_retailers.delivery_route_id",
        "delivery_route_retailers.retailer_id",
        "retailers.name as retailer_name",
        "retailers.phone",
        "delivery_route_retailers.sequence_no",
      );

    return {
      id: String(route.id),
      tenant_id: String(route.tenant_id),
      name: route.name,
      description: route.description ? String(route.description) : null,
      retailers: retailers.map((retailer) => ({
        retailer_id: String(retailer.retailer_id),
        retailer_name: retailer.retailer_name ?? "Unknown retailer",
        phone: retailer.phone ? String(retailer.phone) : null,
        sequence_no: Number(retailer.sequence_no),
      })),
    };
  }

  async replaceRouteRetailers(tenantId: string, routeId: string, retailerIds: string[], db: DbExecutor) {
    await db("delivery_route_retailers")
      .where("tenant_id", tenantId)
      .andWhere("delivery_route_id", routeId)
      .del();

    await db("delivery_route_retailers").insert(
      retailerIds.map((retailerId, index) => ({
        id: crypto.randomUUID(),
        delivery_route_id: routeId,
        tenant_id: tenantId,
        retailer_id: retailerId,
        sequence_no: index + 1,
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      })),
    );

    await db("delivery_routes")
      .where("tenant_id", tenantId)
      .andWhere("id", routeId)
      .update({
        updated_at: this.db.fn.now(),
      });
  }

  async listOrdersForBatch(tenantId: string, orderIds: string[], db: DbExecutor = this.db) {
    if (orderIds.length === 0) {
      return [];
    }

    return db("orders")
      .leftJoin("retailers", "orders.retailer_id", "retailers.id")
      .where("orders.tenant_id", tenantId)
      .whereIn("orders.id", orderIds)
      .select<OrderBatchRow[]>(
        "orders.id",
        "orders.tenant_id",
        "orders.retailer_id",
        "retailers.name as retailer_name",
        "orders.order_number",
        "orders.status",
        "orders.total_amount",
        "orders.created_at",
        "orders.packed_at",
        "orders.dispatched_at",
        "orders.delivered_at",
      );
  }

  async findOpenBatchForOrders(tenantId: string, orderIds: string[], db: DbExecutor = this.db) {
    if (orderIds.length === 0) {
      return [];
    }

    return db("dispatch_batch_orders")
      .join("dispatch_routes", "dispatch_batch_orders.dispatch_route_id", "dispatch_routes.id")
      .where("dispatch_batch_orders.tenant_id", tenantId)
      .whereIn("dispatch_batch_orders.order_id", orderIds)
      .whereIn("dispatch_routes.status", ["PENDING", "DISPATCHED"])
      .select("dispatch_batch_orders.order_id", "dispatch_batch_orders.dispatch_route_id");
  }

  async createDispatchBatch(input: CreateDispatchBatchInput, db: DbExecutor): Promise<DispatchBatchRecord> {
    const batchId = crypto.randomUUID();
    const route = await this.getRouteWithRetailers(input.tenantId, input.routeId, db);
    const orders = await this.listOrdersForBatch(input.tenantId, input.orderIds, db);
    const orderIdsByRetailer = new Map<string, string[]>();

    for (const order of orders) {
      const retailerId = String(order.retailer_id);
      const current = orderIdsByRetailer.get(retailerId) ?? [];
      current.push(String(order.id));
      orderIdsByRetailer.set(retailerId, current);
    }

    await db("dispatch_routes").insert({
      id: batchId,
      tenant_id: input.tenantId,
      delivery_route_id: input.routeId,
      planned_date: input.deliveryDate,
      status: "PENDING",
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    const activeRetailers = (route?.retailers ?? []).filter((retailer) => orderIdsByRetailer.has(retailer.retailer_id));
    const stopIdsByRetailer = new Map<string, string>();

    if (activeRetailers.length > 0) {
      const stopRows = activeRetailers.map((retailer) => {
        const stopId = crypto.randomUUID();
        stopIdsByRetailer.set(retailer.retailer_id, stopId);

        return {
          id: stopId,
          dispatch_route_id: batchId,
          retailer_id: retailer.retailer_id,
          tenant_id: input.tenantId,
          sequence_no: retailer.sequence_no,
          order_ids: orderIdsByRetailer.get(retailer.retailer_id) ?? [],
          delivery_status: "pending",
          created_at: this.db.fn.now(),
          updated_at: this.db.fn.now(),
        };
      });

      await db("dispatch_route_stops").insert(stopRows);
    }

    await db("dispatch_batch_orders").insert(
      orders.map((order) => ({
        id: crypto.randomUUID(),
        dispatch_route_id: batchId,
        route_stop_id: stopIdsByRetailer.get(String(order.retailer_id)) ?? null,
        tenant_id: input.tenantId,
        retailer_id: order.retailer_id,
        order_id: order.id,
        created_at: this.db.fn.now(),
      })),
    );

    return this.getBatchById(input.tenantId, batchId, db) as Promise<DispatchBatchRecord>;
  }

  async listBatches(tenantId: string, db: DbExecutor = this.db): Promise<DispatchBatchListRecord[]> {
    const rows = await db("dispatch_routes")
      .leftJoin("delivery_routes", "dispatch_routes.delivery_route_id", "delivery_routes.id")
      .leftJoin("dispatch_batch_orders", "dispatch_routes.id", "dispatch_batch_orders.dispatch_route_id")
      .where("dispatch_routes.tenant_id", tenantId)
      .groupBy(
        "dispatch_routes.id",
        "delivery_routes.name",
        "dispatch_routes.planned_date",
        "dispatch_routes.status",
        "dispatch_routes.created_at",
      )
      .orderBy("dispatch_routes.created_at", "desc")
      .select(
        "dispatch_routes.id",
        "delivery_routes.name as route_name",
        "dispatch_routes.planned_date",
        "dispatch_routes.status",
        "dispatch_routes.created_at",
      )
      .count<{ order_count: string }>({ order_count: "dispatch_batch_orders.id" }) as CountedBatchRow[];

    return rows.map((row) => this.mapBatchListRow(row));
  }

  async getBatchById(tenantId: string, batchId: string, db: DbExecutor = this.db): Promise<DispatchBatchRecord | null> {
    const row = await db("dispatch_routes")
      .leftJoin("delivery_routes", "dispatch_routes.delivery_route_id", "delivery_routes.id")
      .leftJoin("dispatch_batch_orders", "dispatch_routes.id", "dispatch_batch_orders.dispatch_route_id")
      .where("dispatch_routes.tenant_id", tenantId)
      .andWhere("dispatch_routes.id", batchId)
      .groupBy(
        "dispatch_routes.id",
        "dispatch_routes.delivery_route_id",
        "delivery_routes.name",
        "delivery_routes.description",
        "dispatch_routes.planned_date",
        "dispatch_routes.status",
        "dispatch_routes.created_at",
      )
      .first(
        "dispatch_routes.id",
        "dispatch_routes.delivery_route_id",
        "delivery_routes.name as route_name",
        "delivery_routes.description as route_description",
        "dispatch_routes.planned_date",
        "dispatch_routes.status",
        "dispatch_routes.created_at",
      )
      .count<{ order_count: string }>({ order_count: "dispatch_batch_orders.id" }) as CountedBatchRow | undefined;

    if (!row) {
      return null;
    }

    return {
      ...this.mapBatchListRow(row),
      route_id: row.delivery_route_id ? String(row.delivery_route_id) : null,
      route_description: row.route_description ? String(row.route_description) : null,
    };
  }

  async listBatchOrders(tenantId: string, batchId: string, db: DbExecutor = this.db) {
    return db("dispatch_batch_orders")
      .where("tenant_id", tenantId)
      .andWhere("dispatch_route_id", batchId)
      .select<DispatchBatchOrderRow[]>("order_id", "retailer_id", "route_stop_id");
  }

  async listBatchOrdersWithStatuses(tenantId: string, batchId: string, db: DbExecutor = this.db) {
    return db("dispatch_batch_orders")
      .join("orders", "dispatch_batch_orders.order_id", "orders.id")
      .where("dispatch_batch_orders.tenant_id", tenantId)
      .andWhere("dispatch_batch_orders.dispatch_route_id", batchId)
      .select<DispatchBatchOrderStatusRow[]>("dispatch_batch_orders.order_id", "orders.status");
  }

  async updateBatchStatus(tenantId: string, batchId: string, status: "PENDING" | "DISPATCHED" | "COMPLETED", db: DbExecutor = this.db) {
    const updatedCount = await db("dispatch_routes")
      .where("tenant_id", tenantId)
      .andWhere("id", batchId)
      .update({
        status,
        updated_at: this.db.fn.now(),
        ...(status === "DISPATCHED" ? { departed_at: this.db.fn.now() } : {}),
        ...(status === "COMPLETED" ? { completed_at: this.db.fn.now() } : {}),
      });

    if (!updatedCount) {
      return null;
    }

    return this.getBatchById(tenantId, batchId, db);
  }

  async findBatchByOrderId(tenantId: string, orderId: string, db: DbExecutor = this.db) {
    const row = await db("dispatch_batch_orders")
      .join("dispatch_routes", "dispatch_batch_orders.dispatch_route_id", "dispatch_routes.id")
      .where("dispatch_batch_orders.tenant_id", tenantId)
      .andWhere("dispatch_batch_orders.order_id", orderId)
      .first<DispatchBatchRow>(
        "dispatch_routes.id",
        "dispatch_routes.tenant_id",
        "dispatch_routes.delivery_route_id",
        "dispatch_routes.planned_date",
        "dispatch_routes.status",
        "dispatch_routes.created_at",
      );

    return row ?? null;
  }

  async markBatchStopsCompletedIfDelivered(tenantId: string, batchId: string, db: DbExecutor = this.db) {
    const stops = await db("dispatch_route_stops")
      .where("tenant_id", tenantId)
      .andWhere("dispatch_route_id", batchId)
      .select<{ id: string }[]>("id");

    for (const stop of stops) {
      const rows = await db("dispatch_batch_orders")
        .join("orders", "dispatch_batch_orders.order_id", "orders.id")
        .where("dispatch_batch_orders.tenant_id", tenantId)
        .andWhere("dispatch_batch_orders.route_stop_id", stop.id)
        .select<{ status: OrderStatus }[]>("orders.status");

      const allDelivered = rows.length > 0 && rows.every((row) => row.status === "DELIVERED");
      await db("dispatch_route_stops")
        .where("tenant_id", tenantId)
        .andWhere("id", stop.id)
        .update({
          delivery_status: allDelivered ? "completed" : "pending",
          updated_at: this.db.fn.now(),
        });
    }
  }

  async getBatchSheet(tenantId: string, batchId: string, db: DbExecutor = this.db): Promise<DeliverySheetRecord | null> {
    const batch = await this.getBatchById(tenantId, batchId, db);
    if (!batch) {
      return null;
    }

    const stops = await db("dispatch_route_stops")
      .join("retailers", "dispatch_route_stops.retailer_id", "retailers.id")
      .where("dispatch_route_stops.tenant_id", tenantId)
      .andWhere("dispatch_route_stops.dispatch_route_id", batchId)
      .orderBy("dispatch_route_stops.sequence_no", "asc")
      .select<DispatchStopRow[]>(
        "dispatch_route_stops.id",
        "dispatch_route_stops.dispatch_route_id",
        "dispatch_route_stops.retailer_id",
        "retailers.name as retailer_name",
        "retailers.phone",
        "retailers.address_line1",
        "retailers.locality",
        "retailers.city",
        "retailers.state",
        "retailers.pincode",
        "dispatch_route_stops.sequence_no",
      );

    const orders = await db("dispatch_batch_orders")
      .join("orders", "dispatch_batch_orders.order_id", "orders.id")
      .leftJoin("retailers", "orders.retailer_id", "retailers.id")
      .where("dispatch_batch_orders.tenant_id", tenantId)
      .andWhere("dispatch_batch_orders.dispatch_route_id", batchId)
      .select<OrderBatchRow[]>(
        "orders.id",
        "orders.tenant_id",
        "orders.retailer_id",
        "retailers.name as retailer_name",
        "orders.order_number",
        "orders.status",
        "orders.total_amount",
        "orders.created_at",
        "orders.packed_at",
        "orders.dispatched_at",
        "orders.delivered_at",
      );

    const orderIds = orders.map((order) => String(order.id));
    const items = orderIds.length === 0
      ? []
      : await db("order_items")
        .join("tenant_products", "order_items.product_id", "tenant_products.id")
        .leftJoin("global_brands", "tenant_products.brand_id", "global_brands.id")
        .whereIn("order_items.order_id", orderIds)
        .select<SheetOrderItemRow[]>(
          "order_items.order_id",
          "order_items.id as order_item_id",
          "order_items.product_id",
          "tenant_products.product_name",
          "global_brands.name as brand_name",
          "order_items.quantity",
          "order_items.price",
          "order_items.total_price",
        );

    const itemsByOrderId = new Map<string, SheetOrderItemRow[]>();
    for (const item of items) {
      const orderId = String(item.order_id);
      const current = itemsByOrderId.get(orderId) ?? [];
      current.push(item);
      itemsByOrderId.set(orderId, current);
    }

    const ordersByRetailer = new Map<string, typeof orders>();
    for (const order of orders) {
      const retailerId = String(order.retailer_id);
      const current = ordersByRetailer.get(retailerId) ?? [];
      current.push(order);
      ordersByRetailer.set(retailerId, current);
    }

    return {
      batch: {
        id: batch.id,
        status: batch.status,
        delivery_date: batch.delivery_date,
        created_at: batch.created_at,
      },
      route: {
        id: batch.route_id,
        name: batch.route_name,
        description: batch.route_description,
      },
      retailers: stops.map((stop) => {
        const retailerOrders = ordersByRetailer.get(String(stop.retailer_id)) ?? [];

        return {
          retailer: {
            id: String(stop.retailer_id),
            name: stop.retailer_name ?? "Unknown retailer",
            phone: stop.phone ? String(stop.phone) : null,
            address_line1: stop.address_line1 ? String(stop.address_line1) : null,
            locality: stop.locality ? String(stop.locality) : null,
            city: stop.city ? String(stop.city) : null,
            state: stop.state ? String(stop.state) : null,
            pincode: stop.pincode ? String(stop.pincode) : null,
          },
          sequence_no: Number(stop.sequence_no),
          totals: {
            order_count: retailerOrders.length,
            total_value: retailerOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0),
          },
          orders: retailerOrders.map((order) => ({
            id: String(order.id),
            order_number: order.order_number,
            status: order.status,
            total_amount: Number(order.total_amount ?? 0),
            created_at: toIsoString(order.created_at),
            packed_at: toIsoStringOrNull(order.packed_at),
            dispatched_at: toIsoStringOrNull(order.dispatched_at),
            delivered_at: toIsoStringOrNull(order.delivered_at),
            items: (itemsByOrderId.get(String(order.id)) ?? []).map((item) => ({
              id: String(item.order_item_id),
              product_id: String(item.product_id),
              product_name: item.product_name,
              brand_name: item.brand_name ? String(item.brand_name) : null,
              quantity: Number(item.quantity ?? 0),
              price: Number(item.price ?? 0),
              total_price: Number(item.total_price ?? 0),
            })),
          })),
        };
      }),
    };
  }

  private mapBatchListRow(row: DispatchBatchRow & { order_count?: string | number }): DispatchBatchListRecord {
    return {
      id: String(row.id),
      route_name: row.route_name ? String(row.route_name) : "Unnamed route",
      delivery_date: String(row.planned_date),
      order_count: Number(row.order_count ?? 0),
      status: row.status as DispatchBatchListRecord["status"],
      created_at: toIsoString(row.created_at),
    };
  }
}
