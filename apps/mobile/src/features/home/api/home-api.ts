import { authSessionStore } from "@/features/auth/state/auth-session-store";
import { apiClient } from "@/services/api/api-client";

export type SalesmanVisitItem = {
  id: string;
  retailerName: string;
  locality: string;
  state: "yet-to-visit" | "order-placed" | "inactive";
  note: string;
};

export type SalesmanHomeData = {
  assignedRouteName: string;
  totalRetailersInRoute: number;
  retailersYetToVisitCount: number;
  ordersPlacedTodayCount: number;
  inactiveRetailersCount: number;
  activeScheme: {
    title: string;
    description: string;
  } | null;
  visitPreview: SalesmanVisitItem[];
};

export const homeApi = {
  async getRetailerHome(): Promise<SalesmanHomeData> {
    const session = await authSessionStore.load();
    return apiClient.request<SalesmanHomeData>("/distributors/home", {
      query: {
        tenant_id: session?.user.tenantId ?? "",
      },
    });
  },
};
