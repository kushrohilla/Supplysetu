"use client";

import { ApiError, apiClient } from "@/lib/apiClient";
import {
  RETAILER_ACCESS_TOKEN_STORAGE_KEY,
  RETAILER_DEBUG_TOKEN_STORAGE_KEY,
  RETAILER_SESSION_STORAGE_KEY,
} from "@/services/session.constants";
import type {
  AcceptInviteResponse,
  DistributorOption,
  InviteValidationResponse,
  OtpRequestResponse,
  RetailerSession,
  SelectDistributorResponse,
  VerifyOtpResponse,
} from "@/types/auth";

const canUseStorage = () => typeof window !== "undefined";
const sessionListeners = new Set<() => void>();

let hasHydratedSessionStore = false;
let cachedSessionRaw: string | null | undefined;
let cachedSessionValue: RetailerSession | null | undefined;

const notifyRetailerSessionListeners = () => {
  sessionListeners.forEach((listener) => listener());
};

const readCachedRetailerSession = (): RetailerSession | null => {
  const rawSession = window.localStorage.getItem(RETAILER_SESSION_STORAGE_KEY);
  if (rawSession === cachedSessionRaw && cachedSessionValue !== undefined) {
    return cachedSessionValue;
  }

  cachedSessionRaw = rawSession;

  if (!rawSession) {
    cachedSessionValue = null;
    return null;
  }

  try {
    cachedSessionValue = JSON.parse(rawSession) as RetailerSession;
    return cachedSessionValue;
  } catch {
    window.localStorage.removeItem(RETAILER_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(RETAILER_ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(RETAILER_DEBUG_TOKEN_STORAGE_KEY);
    cachedSessionRaw = null;
    cachedSessionValue = null;
    return null;
  }
};

export const storeRetailerSession = (session: RetailerSession) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(RETAILER_SESSION_STORAGE_KEY, JSON.stringify(session));
  window.localStorage.setItem(RETAILER_ACCESS_TOKEN_STORAGE_KEY, session.accessToken);
  window.localStorage.setItem(RETAILER_DEBUG_TOKEN_STORAGE_KEY, session.accessToken);
  cachedSessionRaw = JSON.stringify(session);
  cachedSessionValue = session;
  notifyRetailerSessionListeners();
};

export const getStoredRetailerSession = (): RetailerSession | null => {
  if (!canUseStorage()) {
    return null;
  }

  return readCachedRetailerSession();
};

export const clearRetailerSession = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(RETAILER_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(RETAILER_ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(RETAILER_DEBUG_TOKEN_STORAGE_KEY);
  cachedSessionRaw = null;
  cachedSessionValue = null;
  notifyRetailerSessionListeners();
};

export const subscribeToRetailerSession = (listener: () => void) => {
  if (!canUseStorage()) {
    return () => undefined;
  }

  sessionListeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== RETAILER_SESSION_STORAGE_KEY) {
      return;
    }

    cachedSessionRaw = undefined;
    cachedSessionValue = undefined;
    listener();
  };

  window.addEventListener("storage", handleStorage);

  if (!hasHydratedSessionStore) {
    hasHydratedSessionStore = true;
    queueMicrotask(() => {
      listener();
    });
  }

  return () => {
    sessionListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
};

export const getRetailerSessionSnapshot = (): RetailerSession | null | undefined => {
  if (!canUseStorage() || !hasHydratedSessionStore) {
    return undefined;
  }

  return readCachedRetailerSession();
};

export const getRetailerSessionServerSnapshot = (): RetailerSession | null | undefined => undefined;

export const requestOtp = (phone: string) =>
  apiClient.post<OtpRequestResponse>("/auth/login", { phone }, {
    auth: false,
  });

export const verifyOtp = async (phone: string, otp: string) => {
  const payload = {
    mobile_number: phone,
    otp,
  };
  console.log("VERIFY PAYLOAD:", payload);

  try {
    const response = await apiClient.post<VerifyOtpResponse>("/auth/verify", payload, {
      auth: false,
    });
    console.log("VERIFY RESPONSE:", response);

    const accessToken = response.access_token ?? response.token;
    if (!accessToken) {
      throw new Error("Verify response did not include a token.");
    }

    const session: RetailerSession = {
      stage: "preselected",
      accessToken,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
      tokenType: response.token_type,
      retailer: response.retailer,
      retailerId: response.retailer.id,
    };

    storeRetailerSession(session);
    console.log("TOKEN SAVED:", accessToken);
    return session;
  } catch (error) {
    console.error("VERIFY ERROR:", error);
    throw error;
  }
};

export const getDistributors = () => apiClient.get<DistributorOption[]>("/auth/distributors");

export const selectDistributor = async (distributor: DistributorOption) => {
  const response = await apiClient.post<SelectDistributorResponse>("/auth/select-distributor", {
    distributor_id: distributor.id,
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

export const validateInvite = (token: string) =>
  apiClient.get<InviteValidationResponse>(`/invites/${encodeURIComponent(token)}`, {
    auth: false,
  });

export const acceptInvite = (token: string) =>
  apiClient.post<AcceptInviteResponse>("/invites/accept", {
    token,
  });

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
