"use client";

import { startTransition, useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/services/api.service";
import { clearAuthSession, getApiErrorMessage } from "@/services/auth.service";
import { reportingService } from "@/services/reporting.service";
import type {
  ReportingDashboardFilters,
  ReportingDirection,
  ReportingOrdersTrendPoint,
  ReportingRetailerPerformanceRow,
  ReportingRetailerSort,
  ReportingRoutePerformanceRow,
  ReportingSummary,
  ReportingTrendPeriod,
} from "@/types/reporting";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value / 100);
const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(value);

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const formatDateValue = (date: Date) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};

const getDefaultFilters = (): ReportingDashboardFilters => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 29);

  return {
    from: formatDateValue(from),
    to: formatDateValue(today),
    period: "weekly",
    sort: "total_value",
    direction: "desc",
    limit: 10,
  };
};

const emptySummary: ReportingSummary = {
  total_orders: 0,
  total_gmv: 0,
  avg_order_value: 0,
  active_retailers: 0,
  new_retailers: 0,
  total_outstanding: 0,
  advance_collected: 0,
  cod_pending: 0,
  top_products: [],
};

const retailerSortLabels: Record<ReportingRetailerSort, string> = {
  last_order: "Last Order",
  total_value: "Total Value",
  outstanding: "Outstanding",
};

const periodOptions: Array<{ label: string; value: ReportingTrendPeriod }> = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const retailerSortOptions: Array<{ label: string; value: ReportingRetailerSort }> = [
  { label: "Total Value", value: "total_value" },
  { label: "Outstanding", value: "outstanding" },
  { label: "Last Order", value: "last_order" },
];

const directionOptions: Array<{ label: string; value: ReportingDirection }> = [
  { label: "Highest First", value: "desc" },
  { label: "Lowest First", value: "asc" },
];

const limitOptions = [5, 10, 15, 20, 25];

type DashboardData = {
  summary: ReportingSummary;
  trend: ReportingOrdersTrendPoint[];
  retailers: ReportingRetailerPerformanceRow[];
  routes: ReportingRoutePerformanceRow[];
};

const isRangeEmpty = (summary: ReportingSummary, trend: ReportingOrdersTrendPoint[]) =>
  summary.total_orders === 0 && trend.every((point) => point.order_count === 0 && point.gmv === 0);

const formatLastOrder = (value: string | null) => (
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "No orders"
);

function MetricCard(props: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{props.value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{props.helper}</p>
    </div>
  );
}

function SectionShell(props: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{props.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{props.description}</p>
      </div>
      <div className="p-5">{props.children}</div>
    </section>
  );
}

function TrendChart(props: {
  data: ReportingOrdersTrendPoint[];
}) {
  const maxOrders = Math.max(...props.data.map((point) => point.order_count), 1);
  const maxGmv = Math.max(...props.data.map((point) => point.gmv), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Order count
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
          GMV
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[680px] items-end gap-4">
          {props.data.map((point) => (
            <div key={point.period_label} className="flex min-w-[72px] flex-1 flex-col items-center gap-3">
              <div className="flex h-56 w-full items-end justify-center gap-2 rounded-2xl bg-slate-50 px-3 py-4">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">{formatNumber(point.order_count)}</span>
                  <div
                    className="w-4 rounded-full bg-amber-500 transition-[height]"
                    style={{ height: `${Math.max((point.order_count / maxOrders) * 100, point.order_count > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">{formatCurrency(point.gmv)}</span>
                  <div
                    className="w-4 rounded-full bg-slate-900 transition-[height]"
                    style={{ height: `${Math.max((point.gmv / maxGmv) * 100, point.gmv > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </div>
              <span className="text-center text-xs font-medium text-slate-600">{point.period_label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReportsScreen() {
  const router = useRouter();
  const [draftFilters, setDraftFilters] = useState<ReportingDashboardFilters>(() => getDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<ReportingDashboardFilters>(() => getDefaultFilters());
  const [dashboard, setDashboard] = useState<DashboardData>({
    summary: emptySummary,
    trend: [],
    retailers: [],
    routes: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      setError(null);

      try {
        const [summary, trend, retailers, routes] = await Promise.all([
          reportingService.fetchSummary(appliedFilters),
          reportingService.fetchOrdersTrend(appliedFilters),
          reportingService.fetchRetailers(appliedFilters),
          reportingService.fetchRoutePerformance(appliedFilters),
        ]);

        setDashboard({
          summary,
          trend,
          retailers,
          routes,
        });
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearAuthSession();
          router.push("/login");
          return;
        }

        setError(getApiErrorMessage(loadError, "Unable to load reports."));
      } finally {
        setLoading(false);
      }
    };

    void loadReports();
  }, [appliedFilters, refreshTick, router]);

  const onDraftChange = <T extends keyof ReportingDashboardFilters>(key: T, value: ReportingDashboardFilters[T]) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const applyFilters = () => {
    startTransition(() => {
      setAppliedFilters(draftFilters);
    });
  };

  const refreshReports = () => {
    setRefreshTick((current) => current + 1);
  };

  const emptyRange = isRangeEmpty(dashboard.summary, dashboard.trend);

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Reports & Analytics</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Operational sales, collections, retailer activity, and route dispatch visibility. Sales metrics include
                confirmed-to-closed orders and exclude draft, placed, and cancelled orders for a conservative operational view.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">Money shown in INR on screen</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">Outstanding uses recorded payments up to the end date</span>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))_160px_180px_160px_140px_auto]">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">From</span>
              <input
                type="date"
                value={draftFilters.from}
                max={draftFilters.to}
                onChange={(event) => onDraftChange("from", event.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">To</span>
              <input
                type="date"
                value={draftFilters.to}
                min={draftFilters.from}
                onChange={(event) => onDraftChange("to", event.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Trend</span>
              <select
                value={draftFilters.period}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => onDraftChange("period", event.target.value as ReportingTrendPeriod)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Retailer Sort</span>
              <select
                value={draftFilters.sort}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => onDraftChange("sort", event.target.value as ReportingRetailerSort)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {retailerSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Direction</span>
              <select
                value={draftFilters.direction}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => onDraftChange("direction", event.target.value as ReportingDirection)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {directionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Rows</span>
              <select
                value={String(draftFilters.limit)}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => onDraftChange("limit", Number(event.target.value))}
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {limitOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={applyFilters}
                disabled={loading}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Loading..." : "Apply"}
              </button>
              <button
                type="button"
                onClick={refreshReports}
                disabled={loading}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Orders"
          value={formatNumber(dashboard.summary.total_orders)}
          helper="Operational order count in range. Draft, placed, and cancelled orders are excluded."
        />
        <MetricCard
          label="Total GMV"
          value={formatCurrency(dashboard.summary.total_gmv)}
          helper="Sum of included order totals in the selected period."
        />
        <MetricCard
          label="Active Retailers"
          value={formatNumber(dashboard.summary.active_retailers)}
          helper="Distinct retailers with at least one included order in range."
        />
        <MetricCard
          label="Avg Order Value"
          value={formatCurrency(dashboard.summary.avg_order_value)}
          helper="Total GMV divided by included order count."
        />
        <MetricCard
          label="Total Outstanding"
          value={formatCurrency(dashboard.summary.total_outstanding)}
          helper="Included order totals minus recorded payments up to the selected end date."
        />
        <MetricCard
          label="Advance Collected"
          value={formatCurrency(dashboard.summary.advance_collected)}
          helper="Advance-mode payments recorded within the selected date range."
        />
        <MetricCard
          label="COD Pending"
          value={formatCurrency(dashboard.summary.cod_pending)}
          helper="Outstanding balance on COD orders only, using the same conservative outstanding rule."
        />
        <MetricCard
          label="New Retailers"
          value={formatNumber(dashboard.summary.new_retailers)}
          helper="Retailers newly linked to this distributor within the selected date range."
        />
      </section>

      {loading && !error ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500 shadow-sm">
          Loading reporting dashboard...
        </div>
      ) : emptyRange ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm">
          <EmptyState
            icon="R"
            title="No operational data for this date range"
            helper="Try widening the date range or checking for confirmed-to-closed orders in this tenant."
          />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-4">
            <SectionShell
              title="Orders & GMV Trend"
              description="Chronological order count and GMV buckets using the selected daily, weekly, or monthly period."
            >
              {dashboard.trend.length === 0 ? (
                <EmptyState
                  icon="T"
                  title="No trend data yet"
                  helper="Once orders move into confirmed-to-closed states, the trend will appear here."
                />
              ) : (
                <TrendChart data={dashboard.trend} />
              )}
            </SectionShell>

            <SectionShell
              title="Retailer Performance"
              description={`${appliedFilters.direction === "desc" ? "Top" : "Bottom"} retailers by ${retailerSortLabels[appliedFilters.sort].toLowerCase()} for the selected range.`}
            >
              {dashboard.retailers.length === 0 ? (
                <EmptyState
                  icon="S"
                  title="No retailer performance rows"
                  helper="Retailer performance requires included orders in the selected date range."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Retailer</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Orders</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Value</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Outstanding</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Last Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.retailers.map((retailer) => (
                        <tr key={retailer.retailer_id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-3 font-medium text-slate-900">{retailer.retailer_name}</td>
                          <td className="px-4 py-3 text-slate-700">{formatNumber(retailer.total_orders)}</td>
                          <td className="px-4 py-3 text-slate-700">{formatCurrency(retailer.total_value)}</td>
                          <td className="px-4 py-3 text-slate-700">{formatCurrency(retailer.outstanding)}</td>
                          <td className="px-4 py-3 text-slate-700">{formatLastOrder(retailer.last_order_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionShell>
          </div>

          <div className="flex flex-col gap-4">
            <SectionShell
              title="Top Products"
              description="Units sold are derived from order items on included operational orders, not catalog popularity."
            >
              {dashboard.summary.top_products.length === 0 ? (
                <EmptyState
                  icon="P"
                  title="No top products yet"
                  helper="Top products will populate once included orders with line items exist in this range."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {dashboard.summary.top_products.map((product, index) => {
                    const maxUnits = Math.max(...dashboard.summary.top_products.map((item) => item.units_sold), 1);
                    return (
                      <div key={product.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{index + 1}. {product.name}</p>
                            <p className="text-xs text-slate-500">{formatNumber(product.units_sold)} units sold</p>
                          </div>
                          <div className="text-sm font-medium text-slate-700">{formatNumber(product.units_sold)}</div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${(product.units_sold / maxUnits) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionShell>

            <SectionShell
              title="Route Performance"
              description="Dispatch and delivery performance by route, based only on current dispatch batch data without inferred SLA timing."
            >
              {dashboard.routes.length === 0 ? (
                <EmptyState
                  icon="D"
                  title="No route performance rows"
                  helper="Route performance appears once dispatch batches exist in the selected date range."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {dashboard.routes.map((route) => (
                    <div key={route.route_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{route.route_name}</h3>
                          <p className="text-xs text-slate-500">
                            {formatNumber(route.total_batches)} batches / {formatNumber(route.total_orders)} orders
                          </p>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                          Delivery rate {formatPercent(route.delivery_rate)}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Dispatched Orders</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{formatNumber(route.dispatched_orders)}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Delivered Orders</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{formatNumber(route.delivered_orders)}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Average Orders / Batch</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{route.avg_orders_per_batch.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionShell>
          </div>
        </div>
      )}
    </div>
  );
}
