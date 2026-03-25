import type { Knex } from "knex";

type InviteRecord = {
  id: string;
  tenant_id: string;
  invite_code: string;
  created_by_user: string | null;
  is_revoked: boolean;
  created_at: string;
};

type TenantRecord = {
  id: string;
  name: string;
  is_active: boolean;
  distributor_logo_url: string | null;
  service_city: string | null;
};

export class InviteRepository {
  constructor(private readonly db: Knex) {}

  async findTenantById(tenantId: string): Promise<TenantRecord | null> {
    const tenant = await this.db("tenants")
      .select("id", "name", "is_active", "distributor_logo_url", "service_city")
      .where({ id: tenantId })
      .first();
    return tenant ?? null;
  }

  async findInviteByTenant(tenantId: string): Promise<InviteRecord | null> {
    const invite = await this.db("distributor_invites")
      .where({ tenant_id: tenantId, is_revoked: false })
      .orderBy("created_at", "desc")
      .first();
    return invite ?? null;
  }

  async findInviteByCode(inviteCode: string): Promise<InviteRecord | null> {
    const invite = await this.db("distributor_invites")
      .where({ invite_code: inviteCode.toUpperCase(), is_revoked: false })
      .first();
    return invite ?? null;
  }

  async insertInvite(record: {
    id: string;
    tenantId: string;
    inviteCode: string;
    createdByUser: string | null;
  }): Promise<InviteRecord> {
    await this.db("distributor_invites").insert({
      id: record.id,
      tenant_id: record.tenantId,
      invite_code: record.inviteCode,
      created_by_user: record.createdByUser,
      is_revoked: false
    });

    return (await this.findInviteByCode(record.inviteCode)) as InviteRecord;
  }

  async joinRetailerNetwork(record: {
    id: string;
    tenantId: string;
    retailerId: string;
    joinSource: "invite_link" | "qr_scan" | "manual_code";
  }): Promise<void> {
    await this.db("retailer_supplier_network")
      .insert({
        id: record.id,
        tenant_id: record.tenantId,
        retailer_id: record.retailerId,
        join_source: record.joinSource,
        status: "active"
      })
      .onConflict(["tenant_id", "retailer_id"])
      .merge({
        status: "active",
        updated_at: this.db.fn.now()
      });
  }

  async getRetailerNetworkList(retailerId: string): Promise<
    Array<{
      tenant_id: string;
      distributor_name: string;
      distributor_logo_url: string | null;
      service_city: string | null;
      joined_at: string;
      status: string;
    }>
  > {
    return this.db("retailer_supplier_network as rsn")
      .join("tenants as t", "rsn.tenant_id", "t.id")
      .where("rsn.retailer_id", retailerId)
      .where("rsn.status", "active")
      .orderBy("rsn.created_at", "desc")
      .select(
        "t.id as tenant_id",
        "t.name as distributor_name",
        "t.distributor_logo_url",
        "t.service_city",
        "rsn.created_at as joined_at",
        "rsn.status"
      );
  }

  async getJoinedRetailersForTenant(tenantId: string): Promise<
    Array<{
      retailer_id: string;
      join_source: string;
      status: string;
      created_at: string;
    }>
  > {
    return this.db("retailer_supplier_network")
      .where("tenant_id", tenantId)
      .orderBy("created_at", "desc")
      .select("retailer_id", "join_source", "status", "created_at");
  }
}
