import NetInfo from "@react-native-community/netinfo";

import { responseCache } from "@/services/cache/cache-store";

import { ApiError } from "./api-error";
import { apiConfig } from "./api-config";

type ResilientRequestOptions = {
  method: string;
  body?: string;
  headers: Record<string, string>;
  cacheTtlMs?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status: number) => [408, 425, 429, 500, 502, 503, 504].includes(status);

const isSafeToRetry = (method: string, headers: Record<string, string>) => {
  return method === "GET" || Boolean(headers["Idempotency-Key"]);
};

export const requestWithResilience = async (url: string, options: ResilientRequestOptions): Promise<Response> => {
  const network = await NetInfo.fetch();

  if (!network.isConnected) {
    if (options.method === "GET") {
      const cached = await responseCache.get(url);

      if (cached) {
        return new Response(JSON.stringify(cached.body), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Cache": "HIT"
          }
        });
      }
    }

    throw new ApiError("No internet connection available", "NETWORK_OFFLINE", 0);
  }

  let attempt = 0;
  let lastResponse: Response | null = null;

  while (attempt < 3) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), apiConfig.timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method,
        body: options.body,
        headers: options.headers,
        signal: controller.signal
      });

      clearTimeout(timeout);
      lastResponse = response;

      if (response.ok) {
        if (options.method === "GET" && options.cacheTtlMs) {
          const cloned = response.clone();
          const body = await cloned.json();
          await responseCache.set(url, body, options.cacheTtlMs);
        }

        return response;
      }

      if (!isRetryableStatus(response.status) || !isSafeToRetry(options.method, options.headers)) {
        return response;
      }
    } catch (error) {
      clearTimeout(timeout);

      if (!isSafeToRetry(options.method, options.headers)) {
        throw error;
      }
    }

    attempt += 1;
    await sleep(350 * attempt);
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new ApiError("Request failed after retries", "NETWORK_REQUEST_FAILED", 0);
};
