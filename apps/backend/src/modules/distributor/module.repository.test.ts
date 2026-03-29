import { describe, expect, it } from "vitest";

import { resolveDistributorTenantColumns } from "./module.repository";

describe("resolveDistributorTenantColumns", () => {
  it("uses null aliases when optional tenant metadata columns are missing", () => {
    expect(resolveDistributorTenantColumns(["id", "code", "name", "is_active"])).toEqual({
      logoColumn: null,
      cityColumn: null,
    });
  });
});
