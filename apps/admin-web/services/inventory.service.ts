"use client";

import { apiService } from "@/services/api.service";
import type { InventoryItem, InventorySyncMetadata, UpdateInventoryPayload } from "@/types/inventory";

type InventoryListParams = {
  search?: string;
};

class InventoryService {
  async fetchInventory(params: InventoryListParams = {}): Promise<InventoryItem[]> {
    const searchParams = new URLSearchParams();

    if (params.search?.trim()) {
      searchParams.set("search", params.search.trim());
    }

    const query = searchParams.toString();
    return apiService.request<InventoryItem[]>(`/admin/inventory${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  }

  async fetchLowStockInventory(params: InventoryListParams = {}): Promise<InventoryItem[]> {
    const searchParams = new URLSearchParams();

    if (params.search?.trim()) {
      searchParams.set("search", params.search.trim());
    }

    const query = searchParams.toString();
    return apiService.request<InventoryItem[]>(`/admin/inventory/low-stock${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  }

  async syncInventory(): Promise<InventorySyncMetadata> {
    return apiService.request<InventorySyncMetadata>("/admin/inventory/sync", {
      method: "POST",
    });
  }

  async updateInventoryItem(productId: string, payload: UpdateInventoryPayload): Promise<InventoryItem> {
    return apiService.request<InventoryItem>(`/admin/inventory/${productId}`, {
      method: "PATCH",
      body: payload,
    });
  }
}

export const inventoryService = new InventoryService();
