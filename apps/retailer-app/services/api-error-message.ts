type ApiErrorPayload = Record<string, unknown> | null;

type ResolveApiErrorMessageInput = {
  baseUrl: string;
  status: number;
  contentType: string | null;
  payload: ApiErrorPayload;
};

const LOCAL_PROXY_PATH = "/api/v1";
const LOCAL_PROXY_BACKEND_MESSAGE = "Local backend is unavailable on port 8080. Start `npm start` in the repo root and try again.";

const isLocalProxyFailure = ({ baseUrl, status, contentType, payload }: ResolveApiErrorMessageInput) =>
  baseUrl === LOCAL_PROXY_PATH &&
  status >= 500 &&
  !contentType?.includes("application/json") &&
  payload === null;

export const resolveApiErrorMessage = ({ baseUrl, status, contentType, payload }: ResolveApiErrorMessageInput) => {
  if (isLocalProxyFailure({ baseUrl, status, contentType, payload })) {
    return LOCAL_PROXY_BACKEND_MESSAGE;
  }

  return {
    code: String(payload?.error_code ?? "REQUEST_FAILED"),
    message: String(payload?.message ?? `API request failed with status ${status}`),
  };
};
