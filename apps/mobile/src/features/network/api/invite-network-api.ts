import { apiConfig } from "@/services/api/api-config";

type InviteValidation = {
  distributor_name: string;
  distributor_logo_url: string | null;
  service_city: string | null;
};

type JoinResponse = {
  join_success: boolean;
  distributor_basic_info: {
    tenant_id: string;
    distributor_name: string;
    distributor_logo_url: string | null;
    service_city: string | null;
  };
};

const assertOk = async (response: Response) => {
  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // no-op
    }
    throw new Error(message);
  }
};

export const inviteNetworkApi = {
  async validateInvite(code: string): Promise<InviteValidation> {
    const response = await fetch(
      `${apiConfig.baseUrl}/public/invite/validate?code=${encodeURIComponent(code)}`,
      { method: "GET" }
    );
    await assertOk(response);
    return (await response.json()) as InviteValidation;
  },

  async joinRetailerNetwork(input: {
    inviteCode: string;
    retailerUserId: string;
    joinSource: "invite_link" | "qr_scan" | "manual_code";
  }): Promise<JoinResponse> {
    const response = await fetch(`${apiConfig.baseUrl}/retailer/network/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invite_code: input.inviteCode,
        retailer_user_id: input.retailerUserId,
        join_source: input.joinSource
      })
    });
    await assertOk(response);
    return (await response.json()) as JoinResponse;
  },

  async listRetailerNetwork(retailerUserId: string): Promise<{
    items: Array<{
      tenant_id: string;
      distributor_name: string;
      distributor_logo_url: string | null;
      service_city: string | null;
      joined_at: string;
      status: string;
      last_ordered_distributor: boolean;
    }>;
  }> {
    const response = await fetch(
      `${apiConfig.baseUrl}/retailer/network/list?retailer_user_id=${encodeURIComponent(retailerUserId)}`,
      { method: "GET" }
    );
    await assertOk(response);
    return (await response.json()) as {
      items: Array<{
        tenant_id: string;
        distributor_name: string;
        distributor_logo_url: string | null;
        service_city: string | null;
        joined_at: string;
        status: string;
        last_ordered_distributor: boolean;
      }>;
    };
  }
};
