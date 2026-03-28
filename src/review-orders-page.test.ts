import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("review orders page", () => {
  it("renders only the non-functional order management placeholder", () => {
    const pageSource = readFileSync("apps/admin-web/app/(protected)/review-orders/page.tsx", "utf8");

    expect(pageSource).toContain('title="Order management is not available yet"');
    expect(pageSource).toContain("Future order review, approval, and status workflows will appear here once backend support is ready.");
    expect(pageSource).not.toContain("OrderReviewQueueScreen");
  });
});
