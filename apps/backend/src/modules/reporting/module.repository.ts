import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";
import { ORDER_STATUS } from "../order/order-status";

type DbExecutor = Knex | Knex.Transaction;

type IncludedOrderRow = {
  id: string;
  retailer_id: string;
  retailer_name?: string | null;
  total_amount: number | string | null;
  payment_mode?: string | null;
  created_at: string | Date;
};

type PaymentRow = {
  order_id: string;
  amount_paise: number | string;
};

type ProductUnitsRow = {
  product_name: string;
  quantity: number | string;
};

type RoutePerformanceRow = {
  route_id?: string | null;
  route_name?: string | null;
  batch_id: string;
  order_id?: string | null;
  order_status?: string | null;
};

const decimalRupeesToPaise = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  const normalized = typeof value === "number" ? value.toFixed(2) : String(value);
  const [wholePart, decimalPart = ""] = normalized.split(".");
  const isNegative = wholePart.startsWith("-");
  const wholeDigits = wholePart.replace("-", "");
  const paise = Number(wholeDigits || "0") * 100 + Number((decimalPart + "00").slice(0, 2));

  return isNegative ? -paise : paise;
};

const toIsoString = (value: string | Date): string => new Date(value).toISOString();

export const REPORTING_INCLUDED_ORDER_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.INVOICED,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.DISPATCHED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CLOSED,
] as const;

export type ReportingIncludedOrder = {
  id: string;
  retailer_id: string;
  retailer_name: string;
  total_amount: number;
  payment_mode: "advance" | "cod" | "credit";
  created_at: string;
};

export type ReportingPayment = {
  order_id: string;
  amount_paise: number;
};

export type ReportingProductUnits = {
  product_name: string;
  quantity: number;
};

export type ReportingRoutePerformanceSource = {
  route_id: string;
  route_name: string;
  batch_id: string;
  order_id: string | null;
  order_status: string | null;
};

export class ReportingRepository extends BaseRepository {
  /**
   * Reporting metrics use a conservative operational-sales definition:
   * include only orders from CONFIRMED onward and exclude DRAFT, PLACED, and CANCELLED.
   */
  async listIncludedOrders(
    tenantId: string,
    range: { from: string; to: string },
    db: DbExecutor = this.db,
  ): Promise<ReportingIncludedOrder[]> {
    const rows = await db("orders")
      .leftJoin("retailers", "orders.retailer_id", "retailers.id")
      .where("orders.tenant_id", tenantId)
      .whereIn("orders.status", [...REPORTING_INCLUDED_ORDER_STATUSES])
      .andWhere("orders.created_at", ">=", range.from)
      .andWhere("orders.created_at", "<=", range.to)
      .orderBy("orders.created_at", "asc")
      .select<IncludedOrderRow[]>(
        "orders.id",
        "orders.retailer_id",
        "retailers.name as retailer_name",
        "orders.total_amount",
        "orders.payment_mode",
        "orders.created_at",
      );

    return rows.map((row) => ({
      id: String(row.id),
      retailer_id: String(row.retailer_id),
      retailer_name: row.retailer_name ?? "Unknown retailer",
      total_amount: decimalRupeesToPaise(row.total_amount),
      payment_mode: (row.payment_mode ?? "cod") as ReportingIncludedOrder["payment_mode"],
      created_at: toIsoString(row.created_at),
    }));
  }

  async countNewRetailers(
    tenantId: string,
    range: { from: string; to: string },
    db: DbExecutor = this.db,
  ): Promise<number> {
    const row = await db("retailer_distributor_links")
      .where("tenant_id", tenantId)
      .andWhere("created_at", ">=", range.from)
      .andWhere("created_at", "<=", range.to)
      .countDistinct<{ count: string }>({ count: "retailer_id" })
      .first();

    return Number(row?.count ?? 0);
  }

  async listPaymentsForOrders(
    tenantId: string,
    orderIds: string[],
    paidToIso: string,
    db: DbExecutor = this.db,
  ): Promise<ReportingPayment[]> {
    if (orderIds.length === 0) {
      return [];
    }

    const rows = await db("payment_transactions")
      .where("tenant_id", tenantId)
      .whereIn("order_id", orderIds)
      .andWhere("paid_at", "<=", paidToIso)
      .select<PaymentRow[]>("order_id", "amount_paise");

    return rows.map((row) => ({
      order_id: String(row.order_id),
      amount_paise: Number(row.amount_paise ?? 0),
    }));
  }

  async sumAdvanceCollected(
    tenantId: string,
    range: { from: string; to: string },
    db: DbExecutor = this.db,
  ): Promise<number> {
    const row = await db("payment_transactions")
      .where("tenant_id", tenantId)
      .andWhere("payment_mode", "advance")
      .andWhere("paid_at", ">=", range.from)
      .andWhere("paid_at", "<=", range.to)
      .sum<{ total: string | number | null }>({ total: "amount_paise" })
      .first();

    return Number(row?.total ?? 0);
  }

  async listProductUnitsForOrders(
    tenantId: string,
    orderIds: string[],
    db: DbExecutor = this.db,
  ): Promise<ReportingProductUnits[]> {
    if (orderIds.length === 0) {
      return [];
    }

    const rows = await db("order_items")
      .join("orders", "order_items.order_id", "orders.id")
      .join("tenant_products", "order_items.product_id", "tenant_products.id")
      .where("orders.tenant_id", tenantId)
      .whereIn("order_items.order_id", orderIds)
      .select<ProductUnitsRow[]>("tenant_products.product_name", "order_items.quantity");

    return rows.map((row) => ({
      product_name: row.product_name,
      quantity: Number(row.quantity ?? 0),
    }));
  }

  async listRoutePerformanceRows(
    tenantId: string,
    range: { from: string; to: string },
    db: DbExecutor = this.db,
  ): Promise<ReportingRoutePerformanceSource[]> {
    const rows = await db("dispatch_routes")
      .join("delivery_routes", "dispatch_routes.delivery_route_id", "delivery_routes.id")
      .leftJoin("dispatch_batch_orders", "dispatch_routes.id", "dispatch_batch_orders.dispatch_route_id")
      .leftJoin("orders", "dispatch_batch_orders.order_id", "orders.id")
      .where("dispatch_routes.tenant_id", tenantId)
      .andWhere("dispatch_routes.planned_date", ">=", range.from)
      .andWhere("dispatch_routes.planned_date", "<=", range.to)
      .select<RoutePerformanceRow[]>(
        "delivery_routes.id as route_id",
        "delivery_routes.name as route_name",
        "dispatch_routes.id as batch_id",
        "dispatch_batch_orders.order_id",
        "orders.status as order_status",
      );

    return rows.map((row) => ({
      route_id: String(row.route_id),
      route_name: row.route_name ?? "Unnamed route",
      batch_id: String(row.batch_id),
      order_id: row.order_id ? String(row.order_id) : null,
      order_status: row.order_status ?? null,
    }));
  }
}
