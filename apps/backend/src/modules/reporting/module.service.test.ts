import { describe, expect, it } from "vitest";

import { ReportingService } from "./module.service";

describe("ReportingService", () => {
  it("rejects date ranges where from is after to", async () => {
    const service = new ReportingService({
      repository: {
        listIncludedOrders: async () => [],
        countNewRetailers: async () => 0,
        listPaymentsForOrders: async () => [],
        sumAdvanceCollected: async () => 0,
        listProductUnitsForOrders: async () => [],
        listRoutePerformanceRows: async () => [],
      },
    });

    await expect(
      service.getSummary("tenant-1", {
        from: "2026-04-01",
        to: "2026-03-01",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_REPORTING_RANGE",
    });
  });
});
