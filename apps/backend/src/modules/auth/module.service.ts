import crypto from "crypto";

import jwt from "jsonwebtoken";

import type { DistributorRepository } from "../distributor/module.repository";
import type { RetailerRecord, RetailerRepository } from "./module.repository";

type TokenPayload = {
  retailerId: string;
  phone: string;
  tenantIds: string[];
};

const otpStore = new Map<string, string>();

export class AuthService {
  constructor(
    private readonly retailerRepository: RetailerRepository,
    private readonly distributorRepository: DistributorRepository,
  ) {}

  generateOtp(): string {
    return process.env.NODE_ENV === "production" ? `${Math.floor(100000 + Math.random() * 900000)}` : "1234";
  }

  async requestOtp(phone: string) {
    const otp = this.generateOtp();
    otpStore.set(phone, otp);

    return {
      verification_id: `${phone}-${Date.now()}`,
      resend_after_seconds: 30,
      otp: process.env.NODE_ENV === "production" ? undefined : otp,
    };
  }

  async verifyOtp(phone: string, otp: string) {
    const storedOtp = otpStore.get(phone);
    if (storedOtp !== otp) {
      return null;
    }

    otpStore.delete(phone);

    let retailer = await this.retailerRepository.findByPhone(phone);
    if (!retailer) {
      retailer = await this.retailerRepository.create({
        phone,
        name: `Retailer ${phone.slice(-4)}`,
        credit_line_status: "none",
      });
    }

    const tenantIds = await this.distributorRepository.ensureRetailerTenantLinks(retailer.id);

    return {
      tokens: this.issueTokens(retailer, tenantIds),
      retailer,
      tenantIds,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const decoded = this.verifyRefreshToken(refreshToken);
    if (!decoded) {
      return null;
    }

    const retailer = await this.retailerRepository.findById(decoded.retailerId);
    if (!retailer) {
      return null;
    }

    const tenantIds = await this.distributorRepository.getTenantIdsForRetailer(retailer.id);
    return this.issueTokens(retailer, tenantIds);
  }

  async updateRetailerProfile(retailerId: string, input: Partial<RetailerRecord>) {
    return this.retailerRepository.update(retailerId, input);
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, process.env.JWT_SECRET ?? "replace-with-a-strong-secret-key") as TokenPayload;
    } catch {
      return null;
    }
  }

  generateIdempotencyKey(): string {
    return crypto.randomUUID();
  }

  private verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? "replace-with-a-strong-secret-key") as TokenPayload;
    } catch {
      return null;
    }
  }

  private issueTokens(retailer: RetailerRecord, tenantIds: string[]) {
    const payload: TokenPayload = {
      retailerId: String(retailer.id),
      phone: retailer.phone,
      tenantIds: tenantIds.map(String),
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET ?? "replace-with-a-strong-secret-key", {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? "1d") as any,
    });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? "replace-with-a-strong-secret-key", {
      expiresIn: "7d" as any,
    });

    return {
      accessToken,
      refreshToken,
      expiresInSeconds: 24 * 60 * 60,
    };
  }
}
