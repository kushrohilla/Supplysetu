"use client";

import { apiService } from "@/services/api.service";
import type {
  AssignRouteRetailersPayload,
  CreateBatchPayload,
  CreateRoutePayload,
  DeliverOrderResult,
  DeliverySheetRecord,
  DispatchBatchListRecord,
  DispatchBatchRecord,
  DispatchRouteRecord,
} from "@/types/dispatch";

class DispatchService {
  // ── Routes ──────────────────────────────────────────────────────────

  async createRoute(payload: CreateRoutePayload): Promise<DispatchRouteRecord> {
    return apiService.request<DispatchRouteRecord>("/admin/routes", {
      method: "POST",
      body: payload,
    });
  }

  async listRoutes(): Promise<DispatchRouteRecord[]> {
    return apiService.request<DispatchRouteRecord[]>("/admin/routes", {
      method: "GET",
    });
  }

  async assignRouteRetailers(routeId: string, payload: AssignRouteRetailersPayload): Promise<DispatchRouteRecord> {
    return apiService.request<DispatchRouteRecord>(
      `/admin/routes/${encodeURIComponent(routeId)}/retailers`,
      { method: "POST", body: payload },
    );
  }

  // ── Batches ─────────────────────────────────────────────────────────

  async createBatch(payload: CreateBatchPayload): Promise<DispatchBatchRecord> {
    return apiService.request<DispatchBatchRecord>("/admin/dispatch/batches", {
      method: "POST",
      body: payload,
    });
  }

  async listBatches(): Promise<DispatchBatchListRecord[]> {
    return apiService.request<DispatchBatchListRecord[]>("/admin/dispatch/batches", {
      method: "GET",
    });
  }

  async getBatchSheet(batchId: string): Promise<DeliverySheetRecord> {
    return apiService.request<DeliverySheetRecord>(
      `/admin/dispatch/batches/${encodeURIComponent(batchId)}/sheet`,
      { method: "GET" },
    );
  }

  async dispatchBatch(batchId: string): Promise<DispatchBatchRecord> {
    return apiService.request<DispatchBatchRecord>(
      `/admin/dispatch/batches/${encodeURIComponent(batchId)}/dispatch`,
      { method: "PATCH" },
    );
  }

  // ── Order delivery ──────────────────────────────────────────────────

  async deliverOrder(orderId: string): Promise<DeliverOrderResult> {
    return apiService.request<DeliverOrderResult>(
      `/admin/orders/${encodeURIComponent(orderId)}/deliver`,
      { method: "PATCH" },
    );
  }
}

export const dispatchService = new DispatchService();
