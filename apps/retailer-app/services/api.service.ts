import { env } from "@/services/env";
import { RETAILER_ACCESS_TOKEN_STORAGE_KEY } from "@/services/session.constants";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  parseJson?: boolean;
};

type ApiErrorIssue = {
  path?: string;
  message: string;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: {
      issues?: ApiErrorIssue[];
      [key: string]: unknown;
    } | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiService {
  constructor(private readonly baseUrl = env.apiBaseUrl) {}

  async request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
    if (!this.baseUrl) {
      throw new Error("Missing NEXT_PUBLIC_API_URL environment variable.");
    }

    const accessToken =
      options.auth === false || typeof window === "undefined"
        ? null
        : window.localStorage.getItem(RETAILER_ACCESS_TOKEN_STORAGE_KEY);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? "GET",
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
      throw new ApiError(
        response.status,
        String(payload?.error_code ?? "REQUEST_FAILED"),
        String(payload?.message ?? `API request failed with status ${response.status}`),
        (payload?.details as ApiError["details"]) ?? null,
      );
    }

    if (options.parseJson === false || response.status === 204) {
      return undefined as TResponse;
    }

    return ((payload?.data ?? payload) as TResponse) ?? (undefined as TResponse);
  }
}

export const apiService = new ApiService();
