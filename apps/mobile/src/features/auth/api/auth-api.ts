import { AuthSession } from "@/features/auth/auth.types";

type RequestOtpPayload = {
  mobileNumber: string;
};

type RequestOtpResponse = {
  verificationId: string;
  resendAfterSeconds: number;
};

type VerifyOtpPayload = {
  mobileNumber: string;
  verificationId: string;
  otp: string;
};

const OTP_CODE = "1234";
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildSession = (mobileNumber: string): AuthSession => {
  const now = Date.now();

  return {
    tokens: {
      accessToken: `mock-access-${mobileNumber}-${now}`,
      refreshToken: `mock-refresh-${mobileNumber}-${now}`,
      accessTokenExpiresAt: now + ACCESS_TOKEN_TTL_MS
    },
    user: {
      id: `rtl-${mobileNumber.slice(-6)}`,
      name: "Retailer",
      role: "retailer",
      tenantId: "tenant-demo",
      mobileNumber
    }
  };
};

export const authApi = {
  async requestOtp(payload: RequestOtpPayload): Promise<RequestOtpResponse> {
    await delay(400);

    return {
      verificationId: `verify-${payload.mobileNumber}-${Date.now()}`,
      resendAfterSeconds: 30
    };
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthSession> {
    await delay(500);

    if (payload.otp !== OTP_CODE) {
      throw new Error("Invalid OTP. Use 1234 for the mock flow.");
    }

    return buildSession(payload.mobileNumber);
  },

  async refresh(refreshToken: string): Promise<AuthSession["tokens"]> {
    await delay(350);

    if (!refreshToken.startsWith("mock-refresh-")) {
      throw new Error("Refresh token is invalid");
    }

    const now = Date.now();

    return {
      accessToken: `mock-access-refresh-${now}`,
      refreshToken: `mock-refresh-refresh-${now}`,
      accessTokenExpiresAt: now + ACCESS_TOKEN_TTL_MS
    };
  }
};
