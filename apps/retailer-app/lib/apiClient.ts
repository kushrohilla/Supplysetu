import {
  RETAILER_ACCESS_TOKEN_STORAGE_KEY,
  RETAILER_DEBUG_TOKEN_STORAGE_KEY,
  RETAILER_SESSION_STORAGE_KEY,
} from "@/services/session.constants";
import { resolveApiErrorMessage } from "@/services/api-error-message";
import { env } from "@/services/env";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  parseJson?: boolean;
};

type ApiErrorIssue = {
  path?: string;
  message: string;
};

type ApiErrorDetails = {
  issues?: ApiErrorIssue[];
  [key: string]: unknown;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ApiErrorDetails | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  constructor(private readonly baseUrl = env.apiBaseUrl) {}

  async get<TResponse>(path: string, options?: Omit<RequestOptions, "body">) {
    return this.request<TResponse>("GET", path, options);
  }

  async post<TResponse>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
    return this.request<TResponse>("POST", path, { ...options, body });
  }

  async patch<TResponse>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
    return this.request<TResponse>("PATCH", path, { ...options, body });
  }

  private async request<TResponse>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<TResponse> {
    if (!this.baseUrl) {
      throw new Error("Missing NEXT_PUBLIC_API_URL environment variable.");
    }

    const accessToken =
      options.auth === false || typeof window === "undefined"
        ? null
        : window.localStorage.getItem(RETAILER_ACCESS_TOKEN_STORAGE_KEY);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    const isJsonResponse = response.headers.get("content-type")?.includes("application/json");
    const payload = isJsonResponse ? ((await response.json()) as Record<string, unknown>) : null;

    if (!response.ok) {
      const resolvedError = resolveApiErrorMessage({
        baseUrl: this.baseUrl,
        status: response.status,
        contentType: response.headers.get("content-type"),
        payload,
      });

      const error = new ApiError(
        response.status,
        typeof resolvedError === "string" ? "LOCAL_BACKEND_UNAVAILABLE" : resolvedError.code,
        typeof resolvedError === "string" ? resolvedError : resolvedError.message,
        (payload?.details as ApiErrorDetails) ?? null,
      );

      if (response.status === 401) {
        this.handleUnauthorized();
      }

      throw error;
    }

    if (options.parseJson === false || response.status === 204) {
      return undefined as TResponse;
    }

    return ((payload?.data ?? payload) as TResponse) ?? (undefined as TResponse);
  }

  private handleUnauthorized() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(RETAILER_ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(RETAILER_DEBUG_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(RETAILER_SESSION_STORAGE_KEY);
    window.location.replace("/login");
  }
}

export const apiClient = new ApiClient();
