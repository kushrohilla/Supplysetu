import { describe, expect, it } from "vitest";

import {
  assertAuthorizedOrderTransition,
  assertNoDuplicateTerminalUpdate,
  assertValidOrderTransition,
  canActorPerformOrderTransition,
  canTransitionOrderStatus
} from "./order-transition-rules";

describe("order transition rules", () => {
  it("allows only the configured workflow transitions", () => {
    expect(canTransitionOrderStatus("pending_approval", "approved_for_export")).toBe(true);
    expect(canTransitionOrderStatus("approved_for_export", "invoiced")).toBe(true);
    expect(canTransitionOrderStatus("pending_approval", "invoiced")).toBe(false);
    expect(canTransitionOrderStatus("delivered", "cancelled")).toBe(false);
  });

  it("restricts actor roles per transition", () => {
    expect(canActorPerformOrderTransition("admin", "pending_approval", "approved_for_export")).toBe(true);
    expect(canActorPerformOrderTransition("sync_worker", "approved_for_export", "invoiced")).toBe(true);
    expect(canActorPerformOrderTransition("admin", "approved_for_export", "invoiced")).toBe(false);
  });

  it("throws structured errors for invalid transitions", () => {
    expect(() => assertValidOrderTransition("pending_approval", "dispatched")).toThrowError(
      /Cannot transition order/
    );
    expect(() => assertAuthorizedOrderTransition("admin", "approved_for_export", "invoiced")).toThrowError(
      /cannot transition/
    );
    expect(() => assertNoDuplicateTerminalUpdate("invoiced", "invoiced")).toThrowError(
      /already in invoiced/
    );
  });
});
