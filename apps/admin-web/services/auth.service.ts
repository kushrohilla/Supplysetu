"use client";

import { apiService, ApiError } from "@/services/api.service";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  AUTH_SESSION_STORAGE_KEY,
  ONBOARDING_COMPLETE_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from "@/services/session.constants";
import type {
  DistributorAuthApiResponse,
  DistributorAuthSession,
  DistributorLoginPayload,
  DistributorSignupPayload,
} from "@/types/auth";

const canUseStorage = () => typeof window !== "undefined";

const mapAuthResponseToSession = (response: DistributorAuthApiResponse): DistributorAuthSession => ({
  accessToken: response.access_token,
  refreshToken: response.refresh_token,
  expiresIn: response.expires_in,
  tokenType: response.token_type,
  user: response.user,
  tenant: response.tenant,
});

export const storeAuthSession = (session: DistributorAuthSession) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, session.refreshToken);
};

export const getStoredSession = (): DistributorAuthSession | null => {
  if (!canUseStorage()) {
    return null;
  }

  const rawSession = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as DistributorAuthSession;
  } catch {
    clearAuthSession();
    return null;
  }
};

export const getAccessToken = (): string | null => {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const isAuthenticated = (): boolean => Boolean(getAccessToken());

export const clearAuthSession = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(ONBOARDING_COMPLETE_STORAGE_KEY);
};

export const getApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
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

export const loginDistributor = async (payload: DistributorLoginPayload): Promise<DistributorAuthSession> => {
  const response = await apiService.request<DistributorAuthApiResponse>("/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  });
  const session = mapAuthResponseToSession(response);
  storeAuthSession(session);
  return session;
};

export const registerDistributor = async (payload: DistributorSignupPayload): Promise<void> => {
  await apiService.request<DistributorAuthApiResponse>("/auth/register", {
    method: "POST",
    body: payload,
    auth: false,
  });
};
