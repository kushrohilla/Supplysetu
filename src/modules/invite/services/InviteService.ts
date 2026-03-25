import crypto from "crypto";
import type { Knex } from "knex";
import { InviteRepository } from "../repositories/InviteRepository";

type ValidateInviteResult = {
  tenantId: string;
  distributorName: string;
  distributorLogoUrl: string | null;
  serviceCity: string | null;
};

export class InviteService {
  private readonly repository: InviteRepository;
  private readonly inviteBaseUrl = "https://app.domain.com/join";

  constructor(db: Knex) {
    this.repository = new InviteRepository(db);
  }

  async generateInviteCodeForTenant(tenantId: string, createdByUser?: string) {
    const tenant = await this.repository.findTenantById(tenantId);
    if (!tenant) {
      throw new Error("TENANT_NOT_FOUND");
    }

    if (!tenant.is_active) {
      throw new Error("TENANT_SUSPENDED");
    }

    const existing = await this.repository.findInviteByTenant(tenantId);
    if (existing) {
      return {
        tenant_id: tenantId,
        invite_code: existing.invite_code,
        invite_url: `${this.inviteBaseUrl}?code=${existing.invite_code}`,
        created_at: existing.created_at
      };
    }

    const inviteCode = await this.generateUniqueCode();
    const created = await this.repository.insertInvite({
      id: crypto.randomUUID(),
      tenantId,
      inviteCode,
      createdByUser: createdByUser ?? null
    });

    return {
      tenant_id: tenantId,
      invite_code: created.invite_code,
      invite_url: `${this.inviteBaseUrl}?code=${created.invite_code}`,
      created_at: created.created_at
    };
  }

  async validateInviteCode(inviteCode: string): Promise<ValidateInviteResult> {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      throw new Error("INVALID_CODE");
    }

    const invite = await this.repository.findInviteByCode(code);
    if (!invite || invite.is_revoked) {
      throw new Error("INVALID_CODE");
    }

    const tenant = await this.repository.findTenantById(invite.tenant_id);
    if (!tenant) {
      throw new Error("TENANT_NOT_FOUND");
    }
    if (!tenant.is_active) {
      throw new Error("TENANT_SUSPENDED");
    }

    return {
      tenantId: tenant.id,
      distributorName: tenant.name,
      distributorLogoUrl: tenant.distributor_logo_url,
      serviceCity: tenant.service_city
    };
  }

  async joinRetailerNetwork(input: {
    inviteCode: string;
    retailerUserId: string;
    joinSource?: "invite_link" | "qr_scan" | "manual_code";
  }) {
    const validation = await this.validateInviteCode(input.inviteCode);
    await this.repository.joinRetailerNetwork({
      id: crypto.randomUUID(),
      tenantId: validation.tenantId,
      retailerId: input.retailerUserId,
      joinSource: input.joinSource ?? "invite_link"
    });

    return {
      join_success: true,
      distributor_basic_info: {
        tenant_id: validation.tenantId,
        distributor_name: validation.distributorName,
        distributor_logo_url: validation.distributorLogoUrl,
        service_city: validation.serviceCity
      }
    };
  }

  async getRetailerNetworkList(retailerUserId: string) {
    const networks = await this.repository.getRetailerNetworkList(retailerUserId);
    return networks.map((network, index) => ({
      tenant_id: network.tenant_id,
      distributor_name: network.distributor_name,
      distributor_logo_url: network.distributor_logo_url,
      service_city: network.service_city,
      joined_at: network.joined_at,
      status: network.status,
      last_ordered_distributor: index === 0
    }));
  }

  async getTenantJoinedRetailers(tenantId: string) {
    const tenant = await this.repository.findTenantById(tenantId);
    if (!tenant) {
      throw new Error("TENANT_NOT_FOUND");
    }
    return this.repository.getJoinedRetailersForTenant(tenantId);
  }

  private async generateUniqueCode(): Promise<string> {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const minLength = 6;
    const maxLength = 8;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const length = attempt < 10 ? minLength : maxLength;
      let code = "";
      for (let i = 0; i < length; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }

      const existing = await this.repository.findInviteByCode(code);
      if (!existing) {
        return code;
      }
    }

    throw new Error("INVITE_CODE_GENERATION_FAILED");
  }
}
