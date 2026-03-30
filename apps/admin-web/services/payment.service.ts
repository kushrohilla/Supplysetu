"use client";

import { apiService } from "@/services/api.service";
import type {
  PaymentRecord,
  PaymentsListResponse,
  RecordPaymentPayload,
  RetailerCreditLimitResponse,
  RetailerCreditSummary,
} from "@/types/payment";

export type PaymentsListParams = {
  retailerId?: string;
  page?: number;
  limit?: number;
};

class PaymentService {
  async fetchPayments(params: PaymentsListParams = {}): Promise<PaymentsListResponse> {
    const searchParams = new URLSearchParams();

    if (params.retailerId) {
      searchParams.set("retailer_id", params.retailerId);
    }
    if (params.page) {
      searchParams.set("page", String(params.page));
    }
    if (params.limit) {
      searchParams.set("limit", String(params.limit));
    }

    const query = searchParams.toString();
    return apiService.request<PaymentsListResponse>(`/admin/payments${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  }

  async recordPayment(payload: RecordPaymentPayload, idempotencyKey?: string): Promise<PaymentRecord> {
    return apiService.request<PaymentRecord>("/admin/payments", {
      method: "POST",
      body: payload,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    });
  }

  async fetchRetailerCreditSummary(retailerId: string): Promise<RetailerCreditSummary> {
    return apiService.request<RetailerCreditSummary>(`/admin/retailers/${retailerId}/credit-summary`, {
      method: "GET",
    });
  }

  async updateRetailerCreditLimit(retailerId: string, creditLimit: number): Promise<RetailerCreditLimitResponse> {
    return apiService.request<RetailerCreditLimitResponse>(`/admin/retailers/${retailerId}/credit-limit`, {
      method: "PATCH",
      body: { credit_limit: creditLimit },
    });
  }
}

export const paymentService = new PaymentService();
