export type ReportingTrendPeriod = "daily" | "weekly" | "monthly";
export type ReportingRetailerSort = "last_order" | "total_value" | "outstanding";
export type ReportingDirection = "asc" | "desc";

export type ReportingSummary = {
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

export type ReportingOrdersTrendPoint = {
  period_label: string;
  order_count: number;
  gmv: number;
};

export type ReportingRetailerPerformanceRow = {
  retailer_id: string;
  retailer_name: string;
  total_orders: number;
  total_value: number;
  outstanding: number;
  last_order_date: string | null;
};

export type ReportingRoutePerformanceRow = {
  route_id: string;
  route_name: string;
  total_batches: number;
  total_orders: number;
  dispatched_orders: number;
  delivered_orders: number;
  delivery_rate: number;
  avg_orders_per_batch: number;
};

export type ReportingDashboardFilters = {
  from: string;
  to: string;
  period: ReportingTrendPeriod;
  sort: ReportingRetailerSort;
  direction: ReportingDirection;
  limit: number;
};
