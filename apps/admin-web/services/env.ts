const normalizeApiUrl = (value: string) => value.replace(/\/+$/, "");

const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error("Missing NEXT_PUBLIC_API_BASE_URL environment variable.");
}

export const env = {
  apiBaseUrl: normalizeApiUrl(apiUrl),
};
