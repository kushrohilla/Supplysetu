const FALLBACK_API_BASE_URL = "http://localhost:5000/api/v1";

export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_API_BASE_URL
};
