import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Dispatch, Delivery, and Packing pages are now live module screens (Phase 2B).
// Only Reports remains as a genuine unavailable placeholder page.
const unavailablePages = [
  {
    path: "apps/admin-web/app/(protected)/reports/page.tsx",
    title: 'title="Reports"',
    message: 'message="This feature is not available yet."',
    futureDescription:
      'futureDescription="Operational reports and business insights will appear here once backend support is ready."',
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
