"use client";

import { apiService } from "@/services/api.service";
import type { AdminRetailerDetail, AdminRetailerListResponse, Retailer } from "@/types/retailer";

export type AdminRetailerListParams = {
  search?: string;
  page?: number;
  limit?: number;
};

class RetailerService {
  async fetchRetailers(): Promise<Retailer[]> {
    return apiService.request<Retailer[]>("/retailers", { method: "GET" });
  }

  async fetchAdminRetailers(params: AdminRetailerListParams = {}): Promise<AdminRetailerListResponse> {
    const searchParams = new URLSearchParams();

    if (params.search?.trim()) {
      searchParams.set("search", params.search.trim());
    }
    if (params.page) {
      searchParams.set("page", String(params.page));
    }
    if (params.limit) {
      searchParams.set("limit", String(params.limit));
    }

    const query = searchParams.toString();
    return apiService.request<AdminRetailerListResponse>(`/admin/retailers${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  }

  async fetchAdminRetailerDetail(retailerId: string): Promise<AdminRetailerDetail> {
    return apiService.request<AdminRetailerDetail>(`/admin/retailers/${retailerId}`, { method: "GET" });
  }
}

export const retailerService = new RetailerService();
