import crypto from "crypto";
import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";

export type DistributorInviteRecord = {
  id: string;
  tenant_id: string;
  invite_token: string;
  expires_at: string | Date;
  is_used: boolean;
  created_at: string | Date;
  distributor_name?: string | null;
};

export class InviteRepository extends BaseRepository {
  private async ensureRetailerDistributorLinksTable() {
    if (process.env.SKIP_MIGRATIONS !== "true") {
      return;
    }

    const hasLinksTable = await this.db.schema.hasTable("retailer_distributor_links");
    if (hasLinksTable) {
      return;
    }

    await this.db.schema.createTable("retailer_distributor_links", (table) => {
      table.uuid("id").primary();
      table.uuid("retailer_id").notNullable();
      table.uuid("tenant_id").notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.db.fn.now());
      table.unique(["retailer_id", "tenant_id"]);
      table.index(["retailer_id"]);
      table.index(["tenant_id"]);
    });
  }

  private async ensureDistributorInvitesTable() {
    if (process.env.SKIP_MIGRATIONS !== "true") {
      return;
    }

    const hasInvitesTable = await this.db.schema.hasTable("distributor_invites");
    if (hasInvitesTable) {
      return;
    }

    await this.db.schema.createTable("distributor_invites", (table) => {
      table.uuid("id").primary();
      table.uuid("tenant_id").notNullable();
      table.text("invite_token").notNullable().unique();
      table.timestamp("expires_at", { useTz: true }).notNullable();
      table.boolean("is_used").notNullable().defaultTo(false);
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(this.db.fn.now());

      table.index(["tenant_id"], "idx_distributor_invites_tenant_id");
      table.index(["invite_token"], "idx_distributor_invites_token");
    });
  }

  async createInvite(input: {
    tenant_id: string;
    invite_token: string;
    expires_at: Date;
    is_used: boolean;
  }) {
    await this.ensureDistributorInvitesTable();

    const id = crypto.randomUUID();
    await this.db("distributor_invites").insert({
      id,
      tenant_id: input.tenant_id,
      invite_token: input.invite_token,
      expires_at: input.expires_at,
      is_used: input.is_used,
      created_at: this.db.fn.now(),
    });

    return this.getInviteById(id);
  }

  async getInviteById(id: string, trx?: Knex.Transaction): Promise<DistributorInviteRecord | null> {
    await this.ensureDistributorInvitesTable();

    const executor = trx ?? this.db;
    const invite = await executor("distributor_invites")
      .join("tenants", "distributor_invites.tenant_id", "tenants.id")
      .where("distributor_invites.id", id)
      .first(
        "distributor_invites.id",
        "distributor_invites.tenant_id",
        "distributor_invites.invite_token",
        "distributor_invites.expires_at",
        "distributor_invites.is_used",
        "distributor_invites.created_at",
        "tenants.name as distributor_name",
      );

    return invite ?? null;
  }

  async getInviteByToken(token: string, trx?: Knex.Transaction): Promise<DistributorInviteRecord | null> {
    await this.ensureDistributorInvitesTable();

    const executor = trx ?? this.db;
    const invite = await executor("distributor_invites")
      .join("tenants", "distributor_invites.tenant_id", "tenants.id")
      .where("distributor_invites.invite_token", token)
      .first(
        "distributor_invites.id",
        "distributor_invites.tenant_id",
        "distributor_invites.invite_token",
        "distributor_invites.expires_at",
        "distributor_invites.is_used",
        "distributor_invites.created_at",
        "tenants.name as distributor_name",
      );

    return invite ?? null;
  }

  async getRetailerDistributorLink(retailerId: string, tenantId: string, trx?: Knex.Transaction) {
    await this.ensureRetailerDistributorLinksTable();

    const executor = trx ?? this.db;
    return executor("retailer_distributor_links")
      .where({
        retailer_id: retailerId,
        tenant_id: tenantId,
      })
      .first("id", "retailer_id", "tenant_id", "created_at");
  }

  async createRetailerDistributorLink(retailerId: string, tenantId: string, trx?: Knex.Transaction) {
    await this.ensureRetailerDistributorLinksTable();

    const executor = trx ?? this.db;
    const id = crypto.randomUUID();
    await executor("retailer_distributor_links").insert({
      id,
      retailer_id: retailerId,
      tenant_id: tenantId,
      created_at: executor.fn.now(),
    });

    return this.getRetailerDistributorLink(retailerId, tenantId, trx);
  }

  async markInviteUsed(inviteId: string, trx?: Knex.Transaction) {
    await this.ensureDistributorInvitesTable();

    const executor = trx ?? this.db;
    await executor("distributor_invites")
      .where({ id: inviteId })
      .update({
        is_used: true,
      });
  }
}
