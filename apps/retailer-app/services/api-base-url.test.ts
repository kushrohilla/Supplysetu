import { describe, expect, it } from "vitest";

import { resolveApiProxyTarget, resolveClientApiBaseUrl } from "./api-base-url";

describe("resolveClientApiBaseUrl", () => {
  it("uses the same-origin proxy for localhost API targets", () => {
    expect(resolveClientApiBaseUrl("http://localhost:8080/api/v1")).toBe("/api/v1");
    expect(resolveClientApiBaseUrl("http://127.0.0.1:8080/api/v1/")).toBe("/api/v1");
  });

  it("keeps remote API targets as absolute URLs", () => {
    expect(resolveClientApiBaseUrl("https://api.supplysetu.example/api/v1")).toBe(
      "https://api.supplysetu.example/api/v1",
    );
  });

  it("falls back to the local proxy path when the API URL is missing", () => {
    expect(resolveClientApiBaseUrl(undefined)).toBe("/api/v1");
  });
});

describe("resolveApiProxyTarget", () => {
  it("defaults the proxy target to the local backend", () => {
    expect(resolveApiProxyTarget(undefined)).toBe("http://127.0.0.1:8080/api/v1");
  });
});
