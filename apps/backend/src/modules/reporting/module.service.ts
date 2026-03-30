import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import type {
  ReportingIncludedOrder,
  ReportingPayment,
  ReportingProductUnits,
  ReportingRoutePerformanceSource,
} from "./module.repository";
import type { ReportingDirection, ReportingRetailerSort, ReportingTrendPeriod } from "./module.schema";

type SummaryResult = {
  total_orders: number;
  total_gmv: number;
  avg_order_value: number;
  active_retailers: number;
  new_retailers: number;
  total_outstanding: number;
  advance_collected: number;
  cod_pending: number;
  top_products: Array<{
    name: string;
    units_sold: number;
  }>;
};

type OrdersTrendPoint = {
  period_label: string;
  order_count: number;
  gmv: number;
};

type RetailerPerformanceRow = {
  retailer_id: string;
  retailer_name: string;
  total_orders: number;
  total_value: number;
  outstanding: number;
  last_order_date: string | null;
};

type RoutePerformanceRow = {
  route_id: string;
  route_name: string;
  total_batches: number;
  total_orders: number;
  dispatched_orders: number;
  delivered_orders: number;
  delivery_rate: number;
  avg_orders_per_batch: number;
};

export interface ReportingRepositoryPort {
  listIncludedOrders(tenantId: string, range: { from: string; to: string }): Promise<ReportingIncludedOrder[]>;
  countNewRetailers(tenantId: string, range: { from: string; to: string }): Promise<number>;
  listPaymentsForOrders(tenantId: string, orderIds: string[], paidToIso: string): Promise<ReportingPayment[]>;
  sumAdvanceCollected(tenantId: string, range: { from: string; to: string }): Promise<number>;
  listProductUnitsForOrders(tenantId: string, orderIds: string[]): Promise<ReportingProductUnits[]>;
  listRoutePerformanceRows(tenantId: string, range: { from: string; to: string }): Promise<ReportingRoutePerformanceSource[]>;
}

const startOfUtcDay = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);
const endOfUtcDay = (isoDate: string) => new Date(`${isoDate}T23:59:59.999Z`);
const formatDay = (date: Date) => date.toISOString().slice(0, 10);
const formatMonth = (date: Date) => date.toISOString().slice(0, 7);
const roundToInt = (value: number) => Math.round(value);
const roundTo = (value: number, digits: number) => Number(value.toFixed(digits));

const getWeekStartUtc = (date: Date) => {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + delta);
  return result;
};

const getMonthStartUtc = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const getBucketStart = (date: Date, period: ReportingTrendPeriod) => {
  switch (period) {
    case "weekly":
      return getWeekStartUtc(date);
    case "monthly":
      return getMonthStartUtc(date);
    case "daily":
    default:
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
};

const nextBucketStart = (date: Date, period: ReportingTrendPeriod) => {
  const next = new Date(date);

  switch (period) {
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "monthly":
      next.setUTCMonth(next.getUTCMonth() + 1, 1);
      break;
    case "daily":
    default:
      next.setUTCDate(next.getUTCDate() + 1);
      break;
  }

  return next;
};

const getBucketLabel = (date: Date, period: ReportingTrendPeriod) => (
  period === "monthly" ? formatMonth(date) : formatDay(date)
);

const getOutstandingByOrder = (orders: ReportingIncludedOrder[], payments: ReportingPayment[]) => {
  const paidByOrderId = new Map<string, number>();

  for (const payment of payments) {
    paidByOrderId.set(payment.order_id, (paidByOrderId.get(payment.order_id) ?? 0) + payment.amount_paise);
  }

  return orders.map((order) => ({
    order_id: order.id,
    retailer_id: order.retailer_id,
    payment_mode: order.payment_mode,
    total_amount: order.total_amount,
    outstanding: Math.max(order.total_amount - (paidByOrderId.get(order.id) ?? 0), 0),
  }));
};

export class ReportingService {
  constructor(private readonly options: {
    repository: ReportingRepositoryPort;
  }) {}

  async getSummary(tenantId: string, query: { from: string; to: string }): Promise<SummaryResult> {
    const range = this.normalizeDateRange(query);
    const orders = await this.options.repository.listIncludedOrders(tenantId, range);
    const orderIds = orders.map((order) => order.id);

    const [newRetailers, advanceCollected, payments, productUnits] = await Promise.all([
      this.options.repository.countNewRetailers(tenantId, range),
      this.options.repository.sumAdvanceCollected(tenantId, range),
      this.options.repository.listPaymentsForOrders(tenantId, orderIds, range.to),
      this.options.repository.listProductUnitsForOrders(tenantId, orderIds),
    ]);

    const totalOrders = orders.length;
    const totalGmv = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const activeRetailers = new Set(orders.map((order) => order.retailer_id)).size;
    const outstandingByOrder = getOutstandingByOrder(orders, payments);
    const totalOutstanding = outstandingByOrder.reduce((sum, order) => sum + order.outstanding, 0);
    const codPending = outstandingByOrder
      .filter((order) => order.payment_mode === "cod")
      .reduce((sum, order) => sum + order.outstanding, 0);

    const unitsByProduct = new Map<string, number>();
    for (const item of productUnits) {
      unitsByProduct.set(item.product_name, (unitsByProduct.get(item.product_name) ?? 0) + item.quantity);
    }

    return {
      total_orders: totalOrders,
      total_gmv: totalGmv,
      avg_order_value: totalOrders === 0 ? 0 : roundToInt(totalGmv / totalOrders),
      active_retailers: activeRetailers,
      new_retailers: newRetailers,
      total_outstanding: totalOutstanding,
      advance_collected: advanceCollected,
      cod_pending: codPending,
      top_products: [...unitsByProduct.entries()]
        .map(([name, unitsSold]) => ({
          name,
          units_sold: unitsSold,
        }))
        .sort((left, right) => right.units_sold - left.units_sold || left.name.localeCompare(right.name))
        .slice(0, 5),
    };
  }

  async getOrdersTrend(
    tenantId: string,
    query: { from: string; to: string; period: ReportingTrendPeriod },
  ): Promise<OrdersTrendPoint[]> {
    const range = this.normalizeDateRange(query);
    const orders = await this.options.repository.listIncludedOrders(tenantId, range);
    const firstBucket = getBucketStart(startOfUtcDay(query.from), query.period);
    const lastBucket = getBucketStart(startOfUtcDay(query.to), query.period);
    const buckets = new Map<string, OrdersTrendPoint>();

    for (let cursor = new Date(firstBucket); cursor.getTime() <= lastBucket.getTime(); cursor = nextBucketStart(cursor, query.period)) {
      const label = getBucketLabel(cursor, query.period);
      buckets.set(label, {
        period_label: label,
        order_count: 0,
        gmv: 0,
      });
    }

    for (const order of orders) {
      const bucketLabel = getBucketLabel(getBucketStart(new Date(order.created_at), query.period), query.period);
      const current = buckets.get(bucketLabel);
      if (!current) {
        continue;
      }

      current.order_count += 1;
      current.gmv += order.total_amount;
    }

    return [...buckets.values()];
  }

  async getRetailers(
    tenantId: string,
    query: { from: string; to: string; sort: ReportingRetailerSort; direction: ReportingDirection; limit: number },
  ): Promise<RetailerPerformanceRow[]> {
    const range = this.normalizeDateRange(query);
    const orders = await this.options.repository.listIncludedOrders(tenantId, range);
    const payments = await this.options.repository.listPaymentsForOrders(
      tenantId,
      orders.map((order) => order.id),
      range.to,
    );
    const outstandingByOrder = getOutstandingByOrder(orders, payments);
    const rowsByRetailer = new Map<string, RetailerPerformanceRow>();

    for (const order of orders) {
      const current = rowsByRetailer.get(order.retailer_id) ?? {
        retailer_id: order.retailer_id,
        retailer_name: order.retailer_name,
        total_orders: 0,
        total_value: 0,
        outstanding: 0,
        last_order_date: null,
      };

      current.total_orders += 1;
      current.total_value += order.total_amount;
      current.last_order_date = !current.last_order_date || new Date(order.created_at).getTime() > new Date(current.last_order_date).getTime()
        ? order.created_at
        : current.last_order_date;
      rowsByRetailer.set(order.retailer_id, current);
    }

    for (const balance of outstandingByOrder) {
      const current = rowsByRetailer.get(balance.retailer_id);
      if (!current) {
        continue;
      }

      current.outstanding += balance.outstanding;
    }

    const directionFactor = query.direction === "asc" ? 1 : -1;
    const rows = [...rowsByRetailer.values()];
    rows.sort((left, right) => {
      const leftValue = query.sort === "last_order"
        ? new Date(left.last_order_date ?? "1970-01-01T00:00:00.000Z").getTime()
        : left[query.sort];
      const rightValue = query.sort === "last_order"
        ? new Date(right.last_order_date ?? "1970-01-01T00:00:00.000Z").getTime()
        : right[query.sort];

      if (leftValue === rightValue) {
        return left.retailer_name.localeCompare(right.retailer_name);
      }

      return (leftValue < rightValue ? -1 : 1) * directionFactor;
    });

    return rows.slice(0, query.limit);
  }

  async getRoutePerformance(tenantId: string, query: { from: string; to: string }): Promise<RoutePerformanceRow[]> {
    this.normalizeDateRange(query);
    const rows = await this.options.repository.listRoutePerformanceRows(tenantId, query);
    const routeMap = new Map<string, {
      route_name: string;
      batches: Set<string>;
      orders: Set<string>;
      dispatched_orders: Set<string>;
      delivered_orders: Set<string>;
    }>();

    for (const row of rows) {
      const current = routeMap.get(row.route_id) ?? {
        route_name: row.route_name,
        batches: new Set<string>(),
        orders: new Set<string>(),
        dispatched_orders: new Set<string>(),
        delivered_orders: new Set<string>(),
      };

      current.batches.add(row.batch_id);
      if (row.order_id) {
        current.orders.add(row.order_id);
        if (row.order_status === "DISPATCHED" || row.order_status === "DELIVERED" || row.order_status === "CLOSED") {
          current.dispatched_orders.add(row.order_id);
        }
        if (row.order_status === "DELIVERED" || row.order_status === "CLOSED") {
          current.delivered_orders.add(row.order_id);
        }
      }

      routeMap.set(row.route_id, current);
    }

    return [...routeMap.entries()]
      .map(([routeId, value]) => {
        const totalBatches = value.batches.size;
        const totalOrders = value.orders.size;
        const dispatchedOrders = value.dispatched_orders.size;
        const deliveredOrders = value.delivered_orders.size;

        return {
          route_id: routeId,
          route_name: value.route_name,
          total_batches: totalBatches,
          total_orders: totalOrders,
          dispatched_orders: dispatchedOrders,
          delivered_orders: deliveredOrders,
          delivery_rate: dispatchedOrders === 0 ? 0 : roundTo(deliveredOrders / dispatchedOrders, 4),
          avg_orders_per_batch: totalBatches === 0 ? 0 : roundTo(totalOrders / totalBatches, 2),
        };
      })
      .sort((left, right) => left.route_name.localeCompare(right.route_name));
  }

  private normalizeDateRange(query: { from: string; to: string }) {
    const fromDate = startOfUtcDay(query.from);
    const toDate = endOfUtcDay(query.to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate.getTime() > toDate.getTime()) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, "INVALID_REPORTING_RANGE", "Reporting date range is invalid");
    }

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };
  }
}
