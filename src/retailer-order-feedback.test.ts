import { describe, expect, test } from "vitest";

import { getOrderCreatedSuccessMessage } from "../apps/retailer-app/lib/order-feedback";

describe("retailer order feedback", () => {
  test("returns a success message when the created flag is present", () => {
    expect(getOrderCreatedSuccessMessage("1")).toBe("Order placed successfully.");
  });

  test("returns null when there is no order creation flag", () => {
    expect(getOrderCreatedSuccessMessage(null)).toBeNull();
    expect(getOrderCreatedSuccessMessage("0")).toBeNull();
  });
});
