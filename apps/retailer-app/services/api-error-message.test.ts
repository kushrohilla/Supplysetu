import { describe, expect, it } from "vitest";

import { resolveApiErrorMessage } from "./api-error-message";

describe("resolveApiErrorMessage", () => {
  it("explains local backend outages for non-JSON proxy 500 responses", () => {
    expect(
      resolveApiErrorMessage({
        baseUrl: "/api/v1",
        status: 500,
        contentType: "text/html; charset=utf-8",
        payload: null,
      }),
    ).toBe("Local backend is unavailable on port 8080. Start `npm start` in the repo root and try again.");
  });

  it("preserves JSON API messages when the backend returned one", () => {
    expect(
      resolveApiErrorMessage({
        baseUrl: "/api/v1",
        status: 500,
        contentType: "application/json; charset=utf-8",
        payload: {
          message: "Something went wrong",
          error_code: "INTERNAL_SERVER_ERROR",
        },
      }),
    ).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    });
  });
});
