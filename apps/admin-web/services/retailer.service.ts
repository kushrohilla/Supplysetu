"use client";

import { apiService } from "@/services/api.service";
import type { Retailer } from "@/types/retailer";

class RetailerService {
  async fetchRetailers(): Promise<Retailer[]> {
    return apiService.request<Retailer[]>("/retailers", { method: "GET" });
  }
}

export const retailerService = new RetailerService();
