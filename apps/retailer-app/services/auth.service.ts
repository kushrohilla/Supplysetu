"use client";

import { ApiError, apiService } from "@/services/api.service";
import {
  RETAILER_ACCESS_TOKEN_STORAGE_KEY,
  RETAILER_SESSION_STORAGE_KEY,
} from "@/services/session.constants";
import type {
  DistributorOption,
  OtpRequestResponse,
  RetailerSession,
  SelectDistributorResponse,
  VerifyOtpResponse,
} from "@/types/auth";

const canUseStorage = () => typeof window !== "undefined";

export const storeRetailerSession = (session: RetailerSession) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(RETAILER_SESSION_STORAGE_KEY, JSON.stringify(session));
  window.localStorage.setItem(RETAILER_ACCESS_TOKEN_STORAGE_KEY, session.accessToken);
};

export const getStoredRetailerSession = (): RetailerSession | null => {
  if (!canUseStorage()) {
    return null;
  }

  const rawSession = window.localStorage.getItem(RETAILER_SESSION_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as RetailerSession;
  } catch {
    clearRetailerSession();
    return null;
  }
};

export const clearRetailerSession = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(RETAILER_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(RETAILER_ACCESS_TOKEN_STORAGE_KEY);
};

export const requestOtp = (phone: string) =>
  apiService.request<OtpRequestResponse>("/auth/login", {
    method: "POST",
    body: { phone },
    auth: false,
  });

export const verifyOtp = async (phone: string, otp: string) => {
  const response = await apiService.request<VerifyOtpResponse>("/auth/verify", {
    method: "POST",
    body: { phone, otp },
    auth: false,
  });

  const session: RetailerSession = {
    stage: "preselected",
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in,
    tokenType: response.token_type,
    retailer: response.retailer,
    retailerId: response.retailer.id,
  };

  storeRetailerSession(session);
  return session;
};

export const getDistributors = () => apiService.request<DistributorOption[]>("/auth/distributors");

export const selectDistributor = async (distributor: DistributorOption) => {
  const response = await apiService.request<SelectDistributorResponse>("/auth/select-distributor", {
    method: "POST",
    body: { distributor_id: distributor.id },
  });

  const currentSession = getStoredRetailerSession();
  const nextSession: RetailerSession = {
    stage: "selected",
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in,
    tokenType: response.token_type,
    retailer: currentSession?.retailer,
    distributor,
    tenantId: response.tenant_id,
    retailerId: response.retailer_id,
  };

  storeRetailerSession(nextSession);
  return nextSession;
};

export const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof ApiError) {
    const issues = error.details?.issues;
    if (Array.isArray(issues) && issues.length > 0) {
      return issues.map((issue) => issue.message).join(", ");
    }

    return error.message || fallbackMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};
