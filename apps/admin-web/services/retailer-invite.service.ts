import { apiService } from "@/services/api.service";
import type { JoinedRetailerRecord, RetailerInviteRecord } from "@/types/retailer-invite";

const USE_MOCK_RETAILER_INVITE = process.env.NEXT_PUBLIC_USE_MOCK_RETAILER_INVITE !== "false";
const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "tenant-demo";

let mockInvite: RetailerInviteRecord = {
  tenant_id: DEFAULT_TENANT_ID,
  invite_code: "INV123AB",
  invite_url: "https://app.domain.com/join?code=INV123AB",
  created_at: new Date().toISOString()
};

const mockJoinedRetailers: JoinedRetailerRecord[] = [
  {
    retailer_id: "rtl-345678",
    join_source: "invite_link",
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString()
  },
  {
    retailer_id: "rtl-789012",
    join_source: "qr_scan",
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  }
];

class RetailerInviteService {
  getTenantId(): string {
    return DEFAULT_TENANT_ID;
  }

  async getCurrentInvite(tenantId: string): Promise<RetailerInviteRecord> {
    if (USE_MOCK_RETAILER_INVITE) {
      return { ...mockInvite };
    }

    try {
      return await apiService.request<RetailerInviteRecord>(
        `/admin/invite/current?tenant_id=${encodeURIComponent(tenantId)}`,
        { method: "GET" }
      );
    } catch {
      return { ...mockInvite };
    }
  }

  async generateInvite(tenantId: string, createdByUser: string): Promise<RetailerInviteRecord> {
    if (USE_MOCK_RETAILER_INVITE) {
      const nextCode = `INV${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      mockInvite = {
        tenant_id: tenantId,
        invite_code: nextCode,
        invite_url: `https://app.domain.com/join?code=${nextCode}`,
        created_at: new Date().toISOString()
      };
      return { ...mockInvite };
    }

    try {
      return await apiService.request<RetailerInviteRecord>("/admin/invite/generate", {
        method: "POST",
        body: { tenant_id: tenantId, created_by_user: createdByUser }
      });
    } catch {
      return { ...mockInvite };
    }
  }

  async getJoinedRetailers(tenantId: string): Promise<JoinedRetailerRecord[]> {
    if (USE_MOCK_RETAILER_INVITE) {
      return [...mockJoinedRetailers];
    }

    try {
      const response = await apiService.request<{ items: JoinedRetailerRecord[] }>(
        `/admin/invite/joined-retailers?tenant_id=${encodeURIComponent(tenantId)}`,
        { method: "GET" }
      );
      return response.items;
    } catch {
      return [...mockJoinedRetailers];
    }
  }
}

export const retailerInviteService = new RetailerInviteService();
