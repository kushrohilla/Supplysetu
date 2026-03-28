import crypto from "crypto";

import jwt from "jsonwebtoken";
import type { Knex } from "knex";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import type { DistributorRepository } from "../distributor/module.repository";
import type {
  AdminAuthRecord,
  AdminTenantRecord,
  AdminUserRecord,
  RetailerRecord,
  RetailerRepository,
} from "./module.repository";

type RetailerTokenPayload = {
  retailerId: string;
  phone: string;
  tenantId?: string;
  tenantIds?: string[];
  tokenType: "retailer";
};

type AdminTokenPayload = {
  userId: string;
  tenantId: string;
  role: string;
  mobileNumber: string;
  tokenType: "admin";
};

const otpStore = new Map<string, string>();

export class AuthService {
  constructor(
    private readonly db: Knex,
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
      });
    }

    const tenantIds = await this.distributorRepository.ensureRetailerTenantLinks(retailer.id);

    return {
      tokens: this.issueRetailerTokens(retailer, { tenantIds }),
      retailer,
      tenantIds,
    };
  }

  async selectDistributor(retailerId: string, tenantId: string) {
    const link = await this.distributorRepository.assertRetailerTenantLink(retailerId, tenantId);
    if (!link) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "DISTRIBUTOR_NOT_FOUND", "Distributor not found");
    }

    const retailer = await this.retailerRepository.findById(retailerId);
    if (!retailer) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "Retailer not found");
    }

    const tokens = this.issueRetailerTokens(retailer, { tenantId });
    return {
      ...tokens,
      tenantId,
      retailerId,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const decoded = this.verifyRefreshToken(refreshToken);
    if (!decoded) {
      return null;
    }

    if (!("retailerId" in decoded) || typeof decoded.retailerId !== "string") {
      return null;
    }

    const retailer = await this.retailerRepository.findById(decoded.retailerId);
    if (!retailer) {
      return null;
    }

    if ("tenantId" in decoded && typeof decoded.tenantId === "string") {
      const link = await this.distributorRepository.assertRetailerTenantLink(retailer.id, decoded.tenantId);
      if (!link) {
        return null;
      }

      return this.issueRetailerTokens(retailer, { tenantId: decoded.tenantId });
    }

    const tenantIds = await this.distributorRepository.getTenantIdsForRetailer(retailer.id);
    return this.issueRetailerTokens(retailer, { tenantIds });
  }

  async updateRetailerProfile(retailerId: string, input: Partial<RetailerRecord>) {
    return this.retailerRepository.update(retailerId, input);
  }

  async registerDistributor(input: {
    distributor_name: string;
    owner_name: string;
    mobile_number: string;
    gst_number: string;
    full_address: string;
    password: string;
  }) {
    const existingTenant = await this.retailerRepository.findTenantByNameOrMobile(
      input.distributor_name,
      input.mobile_number,
    );

    if (existingTenant) {
      return null;
    }

    const tenantCode = this.generateTenantCode(input.distributor_name);
    const passwordHash = this.hashPassword(input.password);
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const created = await this.db.transaction(async (trx: Knex.Transaction) => {
      return this.retailerRepository.createDistributorAdmin(
        {
          tenantId,
          tenantCode,
          distributorName: input.distributor_name.trim(),
          ownerName: input.owner_name.trim(),
          mobileNumber: input.mobile_number.trim(),
          gstNumber: input.gst_number.trim().toUpperCase(),
          fullAddress: input.full_address.trim(),
          userId,
          username: input.distributor_name.trim(),
          email: `${input.mobile_number.trim()}@supplysetu.local`,
          passwordHash,
          role: "distributor_admin",
        },
        trx,
      );
    });

    return this.buildAdminAuthResponse(created);
  }

  async loginDistributor(identifier: string, password: string) {
    const authRecord = await this.retailerRepository.findAdminAuthRecordByIdentifier(identifier);
    if (!authRecord || !authRecord.user.is_active || !authRecord.tenant.is_active) {
      return null;
    }

    if (!this.verifyPassword(password, authRecord.user.password_hash)) {
      return null;
    }

    return this.buildAdminAuthResponse(authRecord);
  }

  verifyAccessToken(token: string): RetailerTokenPayload | AdminTokenPayload | null {
    try {
      return jwt.verify(
        token,
        process.env.JWT_SECRET ?? "replace-with-a-strong-secret-key",
      ) as RetailerTokenPayload | AdminTokenPayload;
    } catch {
      return null;
    }
  }

  generateIdempotencyKey(): string {
    return crypto.randomUUID();
  }

  private buildAdminAuthResponse(authRecord: AdminAuthRecord) {
    return {
      tokens: this.issueAdminTokens(authRecord.user, authRecord.tenant),
      user: {
        id: authRecord.user.id,
        tenant_id: authRecord.user.tenant_id,
        username: authRecord.user.username ?? authRecord.tenant.name,
        mobile_number: authRecord.user.mobile_number ?? authRecord.tenant.mobile_number ?? "",
        role: authRecord.user.role,
      },
      tenant: {
        id: authRecord.tenant.id,
        code: authRecord.tenant.code,
        distributor_name: authRecord.tenant.name,
        owner_name: authRecord.tenant.owner_name ?? "",
        mobile_number: authRecord.tenant.mobile_number ?? "",
        gst_number: authRecord.tenant.gst_number ?? "",
        full_address: authRecord.tenant.full_address ?? "",
      },
    };
  }

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${derivedKey}`;
  }

  private verifyPassword(password: string, passwordHash: string): boolean {
    const [salt, storedHash] = passwordHash.split(":");
    if (!salt || !storedHash) {
      return false;
    }

    const derivedKey = crypto.scryptSync(password, salt, 64);
    const storedBuffer = Buffer.from(storedHash, "hex");

    if (derivedKey.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, storedBuffer);
  }

  private generateTenantCode(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);

    return `${slug || "tenant"}-${Date.now().toString(36)}`;
  }

  private verifyRefreshToken(token: string): RetailerTokenPayload | AdminTokenPayload | null {
    try {
      return jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? "replace-with-a-strong-secret-key",
      ) as RetailerTokenPayload | AdminTokenPayload;
    } catch {
      return null;
    }
  }

  private issueRetailerTokens(
    retailer: RetailerRecord,
    selection: { tenantId?: string; tenantIds?: string[] },
  ) {
    const payload: RetailerTokenPayload = {
      retailerId: String(retailer.id),
      phone: retailer.phone,
      tokenType: "retailer",
      tenantId: selection.tenantId ? String(selection.tenantId) : undefined,
      tenantIds: selection.tenantIds?.map(String),
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

  private issueAdminTokens(user: AdminUserRecord, tenant: AdminTenantRecord) {
    const payload: AdminTokenPayload = {
      userId: String(user.id),
      tenantId: String(tenant.id),
      role: user.role,
      mobileNumber: user.mobile_number ?? tenant.mobile_number ?? "",
      tokenType: "admin",
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET ?? "replace-with-a-strong-secret-key", {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? "1d") as any,
    });
    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? "replace-with-a-strong-secret-key",
      {
        expiresIn: "7d" as any,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresInSeconds: 24 * 60 * 60,
    };
  }
}
