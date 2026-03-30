import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const unavailablePages = [
  {
    path: "apps/admin-web/app/(protected)/packing/page.tsx",
    title: 'title="Packing"',
    message: 'message="This feature is not available yet."',
    futureDescription:
      'futureDescription="Packing queues, pick lists, and completion workflows will appear here once backend support is ready."',
  },
  {
    path: "apps/admin-web/app/(protected)/dispatch/page.tsx",
    title: 'title="Dispatch"',
    message: 'message="This feature is not available yet."',
    futureDescription:
      'futureDescription="Dispatch planning, batching, and logistics coordination will appear here once backend support is ready."',
  },
  {
    path: "apps/admin-web/app/(protected)/delivery/page.tsx",
    title: 'title="Delivery"',
    message: 'message="This feature is not available yet."',
    futureDescription:
      'futureDescription="Delivery execution, proof of delivery, and collection workflows will appear here once backend support is ready."',
  },
  {
    path: "apps/admin-web/app/(protected)/reports/page.tsx",
    title: 'title="Reports"',
    message: 'message="This feature is not available yet."',
    futureDescription:
      'futureDescription="Operational reports and business insights will appear here once backend support is ready."',
  },
  {
    path: "apps/admin-web/app/(protected)/payments/page.tsx",
    title: 'title="Payments"',
    message: 'message="This feature is not available yet."',
    futureDescription:
      'futureDescription="Payment tracking, reconciliation, and settlement workflows will appear here once backend support is ready."',
  },
];

describe("unsupported admin pages", () => {
  it("render explicit empty states instead of blank or implied functionality", () => {
    for (const page of unavailablePages) {
      const pageSource = readFileSync(page.path, "utf8");

      expect(pageSource).toContain("ModuleUnavailableState");
      expect(pageSource).toContain(page.title);
      expect(pageSource).toContain(page.message);
      expect(pageSource).toContain(page.futureDescription);
    }
  });
});
