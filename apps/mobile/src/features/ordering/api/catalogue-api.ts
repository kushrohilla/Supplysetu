import { authSessionStore } from "@/features/auth/state/auth-session-store";
import { apiClient } from "@/services/api/api-client";

import { BrandSummary, ProductSummary } from "../ordering.types";

const getTenantId = async () => {
  const session = await authSessionStore.load();
  return session?.user.tenantId ?? "";
};

export const catalogueApi = {
  async getBrands(): Promise<BrandSummary[]> {
    const tenantId = await getTenantId();
    return apiClient.request<BrandSummary[]>("/catalogue/brands", {
      query: {
        tenant_id: tenantId,
      },
    });
  },

  async getProducts(params: {
    brandId?: string;
    search?: string;
    page: number;
  }): Promise<{
    items: ProductSummary[];
    nextPage: number | null;
  }> {
    const tenantId = await getTenantId();

    if (params.search?.trim()) {
      const items = await apiClient.request<ProductSummary[]>("/catalogue/search", {
        query: {
          tenant_id: tenantId,
          q: params.search.trim(),
        },
      });

      return {
        items,
        nextPage: null,
      };
    }

    return apiClient.request<{ items: ProductSummary[]; nextPage: number | null }>(
      `/catalogue/brands/${params.brandId}/products`,
      {
        query: {
          tenant_id: tenantId,
          page: params.page,
          page_size: 12,
        },
      },
    );
  },

  async submitOrder(params: {
    paymentMode: "advance" | "cod";
    subtotal: number;
    totalQuantity: number;
  }): Promise<{
    orderId: string;
    expectedDeliveryDate: string;
    paymentMode: "advance" | "cod";
    subtotal: number;
    totalQuantity: number;
  }> {
    return {
      orderId: `pending-${Date.now()}`,
      expectedDeliveryDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      paymentMode: params.paymentMode,
      subtotal: params.subtotal,
      totalQuantity: params.totalQuantity,
    };
  },
};
