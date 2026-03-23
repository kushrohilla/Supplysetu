import { refreshStoredSession } from "@/features/auth/state/auth-refresh";
import { authSessionStore } from "@/features/auth/state/auth-session-store";

import { ApiError } from "./api-error";
import { apiConfig } from "./api-config";
import { requestWithResilience } from "./request-with-resilience";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  idempotencyKey?: string;
  cacheTtlMs?: number;
};

type ApiEnvelope<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error_code: string;
      message: string;
      details?: Record<string, unknown> | null;
    };

const buildUrl = (path: string, query?: ApiRequestOptions["query"]) => {
  const url = new URL(`${apiConfig.baseUrl}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

export const apiClient = {
  async request<T>(path: string, options: ApiRequestOptions = {}, retryingAfterRefresh = false): Promise<T> {
    let session = options.requiresAuth === false ? null : await authSessionStore.load();

    if (session && session.tokens.accessTokenExpiresAt <= Date.now()) {
      await refreshStoredSession();
      session = await authSessionStore.load();
    }

    const response = await requestWithResilience(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      body: options.body ? JSON.stringify(options.body) : undefined,
      cacheTtlMs: options.cacheTtlMs,
      headers: {
        "Content-Type": "application/json",
        ...(session?.tokens.accessToken ? { Authorization: `Bearer ${session.tokens.accessToken}` } : {}),
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
        ...options.headers
      }
    });

    if (response.status === 401 && options.requiresAuth !== false && !retryingAfterRefresh) {
      const refreshedAccessToken = await refreshStoredSession();

      if (refreshedAccessToken) {
        return apiClient.request<T>(path, options, true);
      }
    }

    const payload = (await response.json()) as ApiEnvelope<T>;

    if (!payload.success) {
      throw new ApiError(payload.message, payload.error_code, response.status, payload.details ?? null);
    }

    return payload.data;
  }
};
