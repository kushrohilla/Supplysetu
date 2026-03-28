import { describe, expect, it } from "vitest";

import {
  canTransitionOrderStatus
} from "./order-transition-rules";

describe("order transition rules", () => {
  it("allows only the configured workflow transitions", () => {
    expect(canTransitionOrderStatus("DRAFT", "PLACED")).toBe(true);
    expect(canTransitionOrderStatus("DRAFT", "CONFIRMED")).toBe(true);
    expect(canTransitionOrderStatus("PLACED", "CONFIRMED")).toBe(true);
    expect(canTransitionOrderStatus("PLACED", "CANCELLED")).toBe(true);
    expect(canTransitionOrderStatus("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransitionOrderStatus("CONFIRMED", "PLACED")).toBe(false);
    expect(canTransitionOrderStatus("CANCELLED", "PLACED")).toBe(false);
  });
});
