const LOCAL_API_PROXY_PATH = "/api/v1";
const DEFAULT_LOCAL_API_TARGET = "http://127.0.0.1:8080/api/v1";
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const normalizeApiUrl = (value: string) => value.replace(/\/+$/, "");

const parseApiUrl = (value: string) => {
  try {
    return new URL(normalizeApiUrl(value));
  } catch {
    return null;
  }
};

export const resolveClientApiBaseUrl = (configuredApiUrl?: string) => {
  if (!configuredApiUrl) {
    return LOCAL_API_PROXY_PATH;
  }

  const parsedUrl = parseApiUrl(configuredApiUrl);
  if (!parsedUrl) {
    return normalizeApiUrl(configuredApiUrl);
  }

  if (LOCALHOST_HOSTNAMES.has(parsedUrl.hostname)) {
    return LOCAL_API_PROXY_PATH;
  }

  return parsedUrl.toString();
};

export const resolveApiProxyTarget = (configuredApiUrl?: string) =>
  normalizeApiUrl(configuredApiUrl || DEFAULT_LOCAL_API_TARGET);
