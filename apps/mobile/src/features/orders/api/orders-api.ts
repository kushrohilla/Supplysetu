import { authSessionStore } from "@/features/auth/state/auth-session-store";
import { apiClient } from "@/services/api/api-client";

import { RetailerOrder } from "../orders.types";

const getTenantId = async () => {
  const session = await authSessionStore.load();
  return session?.user.tenantId ?? "";
};

export const ordersApi = {
  async listOrders(): Promise<RetailerOrder[]> {
    const tenantId = await getTenantId();
    return apiClient.request<RetailerOrder[]>("/orders/list", {
      query: {
        tenant_id: tenantId,
      },
    });
  },

  async getOrder(orderId: string): Promise<RetailerOrder | null> {
    try {
      return await apiClient.request<RetailerOrder>(`/orders/${orderId}`);
    } catch {
      return null;
    }
  },
};
