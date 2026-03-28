const normalizeApiUrl = (value: string) => value.replace(/\/+$/, "");

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const env = {
  apiBaseUrl: apiUrl ? normalizeApiUrl(apiUrl) : "",
};
