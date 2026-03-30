import { describe, expect, it } from "vitest";

import {
  reportingDateRangeSchema,
  reportingOrdersTrendQuerySchema,
  reportingRetailersQuerySchema,
} from "./module.schema";

describe("reporting schemas", () => {
  it("requires from and to date params for summary-style queries", () => {
    expect(() => reportingDateRangeSchema.parse({ from: "2026-03-01" })).toThrow();
    expect(() => reportingDateRangeSchema.parse({ to: "2026-03-31" })).toThrow();
    expect(() => reportingDateRangeSchema.parse({ from: "2026/03/01", to: "2026-03-31" })).toThrow();
  });

  it("validates trend period values", () => {
    expect(() =>
      reportingOrdersTrendQuerySchema.parse({
        from: "2026-03-01",
        to: "2026-03-31",
        period: "quarterly",
      }),
    ).toThrow();
  });

  it("applies retailer defaults conservatively", () => {
    expect(
      reportingRetailersQuerySchema.parse({
        from: "2026-03-01",
        to: "2026-03-31",
      }),
    ).toEqual({
      from: "2026-03-01",
      to: "2026-03-31",
      sort: "total_value",
      direction: "desc",
      limit: 10,
    });
  });
});
