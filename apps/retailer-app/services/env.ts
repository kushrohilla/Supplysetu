import { resolveClientApiBaseUrl } from "@/services/api-base-url";

export const env = {
  apiBaseUrl: resolveClientApiBaseUrl(process.env.NEXT_PUBLIC_API_URL),
};
