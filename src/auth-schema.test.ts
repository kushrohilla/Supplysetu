import { describe, expect, it } from "vitest";

import { verifyOtpSchema } from "../apps/backend/src/modules/auth/module.schema";

describe("auth verify OTP schema", () => {
  it("accepts mobile_number and otp", () => {
    expect(
      verifyOtpSchema.parse({
        mobile_number: "9999999999",
        otp: "1234",
      }),
    ).toEqual({
      mobile_number: "9999999999",
      otp: "1234",
    });
  });

  it("rejects the legacy phone field", () => {
    expect(() =>
      verifyOtpSchema.parse({
        phone: "9999999999",
        otp: "1234",
      }),
    ).toThrow();
  });
});
