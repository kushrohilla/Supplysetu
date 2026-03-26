import { apiClient } from "@/services/api/api-client";

import { AuthSession } from "../auth.types";

type RequestOtpPayload = {
  mobileNumber: string;
};

type RequestOtpResponse = {
  verificationId: string;
  resendAfterSeconds: number;
  otp?: string;
};

type VerifyOtpPayload = {
  mobileNumber: string;
  verificationId: string;
  otp: string;
};

type VerifyOtpResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  retailer: {
    id: string | number;
    name: string;
    phone: string;
  };
  tenant_ids: Array<string | number>;
};

const toSession = (payload: VerifyOtpResponse): AuthSession => ({
  tokens: {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    accessTokenExpiresAt: Date.now() + payload.expires_in * 1000,
  },
  user: {
    id: String(payload.retailer.id),
    name: payload.retailer.name,
    role: "retailer",
    tenantId: String(payload.tenant_ids[0] ?? ""),
    mobileNumber: payload.retailer.phone,
  },
});

export const authApi = {
  async requestOtp(payload: RequestOtpPayload): Promise<RequestOtpResponse> {
    const response = await apiClient.request<{
      verification_id: string;
      resend_after_seconds: number;
      otp?: string;
    }>("/auth/login", {
      method: "POST",
      body: {
        phone: payload.mobileNumber,
      },
      requiresAuth: false,
    });

    return {
      verificationId: response.verification_id,
      resendAfterSeconds: response.resend_after_seconds,
      otp: response.otp,
    };
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthSession> {
    const response = await apiClient.request<VerifyOtpResponse>("/auth/verify", {
      method: "POST",
      body: {
        phone: payload.mobileNumber,
        otp: payload.otp,
      },
      requiresAuth: false,
    });

    return toSession(response);
  },

  async refresh(refreshToken: string): Promise<AuthSession["tokens"]> {
    const response = await apiClient.request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>("/auth/refresh", {
      method: "POST",
      body: {
        refresh_token: refreshToken,
      },
      requiresAuth: false,
    });

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      accessTokenExpiresAt: Date.now() + response.expires_in * 1000,
    };
  },
};
