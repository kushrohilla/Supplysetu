"use client";

import { apiService } from "@/services/api.service";
import type {
  ReportingDashboardFilters,
  ReportingOrdersTrendPoint,
  ReportingRetailerPerformanceRow,
  ReportingRoutePerformanceRow,
  ReportingSummary,
} from "@/types/reporting";

const buildDateRangeParams = (filters: { from: string; to: string }) => {
  const searchParams = new URLSearchParams();
  searchParams.set("from", filters.from);
  searchParams.set("to", filters.to);
  return searchParams;
};

export const reportingService = {
  async fetchSummary(filters: Pick<ReportingDashboardFilters, "from" | "to">) {
    const searchParams = buildDateRangeParams(filters);
    return apiService.request<ReportingSummary>(`/admin/reports/summary?${searchParams.toString()}`, {
      method: "GET",
    });
  },

  async fetchOrdersTrend(filters: Pick<ReportingDashboardFilters, "from" | "to" | "period">) {
    const searchParams = buildDateRangeParams(filters);
    searchParams.set("period", filters.period);
    return apiService.request<ReportingOrdersTrendPoint[]>(`/admin/reports/orders-trend?${searchParams.toString()}`, {
      method: "GET",
    });
  },

  async fetchRetailers(filters: Pick<ReportingDashboardFilters, "from" | "to" | "sort" | "direction" | "limit">) {
    const searchParams = buildDateRangeParams(filters);
    searchParams.set("sort", filters.sort);
    searchParams.set("direction", filters.direction);
    searchParams.set("limit", String(filters.limit));
    return apiService.request<ReportingRetailerPerformanceRow[]>(`/admin/reports/retailers?${searchParams.toString()}`, {
      method: "GET",
    });
  },

  async fetchRoutePerformance(filters: Pick<ReportingDashboardFilters, "from" | "to">) {
    const searchParams = buildDateRangeParams(filters);
    return apiService.request<ReportingRoutePerformanceRow[]>(`/admin/reports/route-performance?${searchParams.toString()}`, {
      method: "GET",
    });
  },
};
