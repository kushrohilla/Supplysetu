import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";

export interface RetailerRecord {
  id: string;
  phone: string;
  name: string;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  owner_name?: string | null;
  credit_line_status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminTenantRecord {
  id: string;
  code: string;
  name: string;
  owner_name?: string | null;
  mobile_number?: string | null;
  gst_number?: string | null;
  full_address?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserRecord {
  id: string;
  tenant_id: string;
  email: string;
  username?: string | null;
  mobile_number?: string | null;
  password_hash: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminAuthRecord {
  user: AdminUserRecord;
  tenant: AdminTenantRecord;
}

export class RetailerRepository extends BaseRepository {
  async findByPhone(phone: string): Promise<RetailerRecord | null> {
    const retailer = await this.db("retailers").where({ phone }).first();
    return retailer ?? null;
  }

  async findById(id: string): Promise<RetailerRecord | null> {
    const retailer = await this.db("retailers").where({ id }).first();
    return retailer ?? null;
  }

  async create(input: Pick<RetailerRecord, "phone" | "name" | "credit_line_status">): Promise<RetailerRecord> {
    const [id] = await this.db("retailers").insert(input);
    return this.findById(String(id)) as Promise<RetailerRecord>;
  }

  async update(id: string, input: Partial<RetailerRecord>): Promise<RetailerRecord> {
    await this.db("retailers").where({ id }).update({
      ...input,
      updated_at: this.db.fn.now(),
    });

    return this.findById(id) as Promise<RetailerRecord>;
  }

  async findAdminAuthRecordByIdentifier(identifier: string): Promise<AdminAuthRecord | null> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const row = await this.db("users")
      .join("tenants", "users.tenant_id", "tenants.id")
      .where((queryBuilder) => {
        queryBuilder
          .whereRaw("LOWER(COALESCE(users.email, '')) = ?", [normalizedIdentifier])
          .orWhereRaw("LOWER(COALESCE(users.username, '')) = ?", [normalizedIdentifier])
          .orWhereRaw("LOWER(COALESCE(users.mobile_number, '')) = ?", [normalizedIdentifier])
          .orWhereRaw("LOWER(COALESCE(tenants.name, '')) = ?", [normalizedIdentifier])
          .orWhereRaw("LOWER(COALESCE(tenants.mobile_number, '')) = ?", [normalizedIdentifier]);
      })
      .first(
        "users.id as user_id",
        "users.tenant_id as user_tenant_id",
        "users.email as user_email",
        "users.username as user_username",
        "users.mobile_number as user_mobile_number",
        "users.password_hash as user_password_hash",
        "users.role as user_role",
        "users.is_active as user_is_active",
        "users.created_at as user_created_at",
        "users.updated_at as user_updated_at",
        "tenants.id as tenant_id",
        "tenants.code as tenant_code",
        "tenants.name as tenant_name",
        "tenants.owner_name as tenant_owner_name",
        "tenants.mobile_number as tenant_mobile_number",
        "tenants.gst_number as tenant_gst_number",
        "tenants.full_address as tenant_full_address",
        "tenants.is_active as tenant_is_active",
        "tenants.created_at as tenant_created_at",
        "tenants.updated_at as tenant_updated_at",
      );

    if (!row) {
      return null;
    }

    return {
      user: {
        id: String(row.user_id),
        tenant_id: String(row.user_tenant_id),
        email: row.user_email,
        username: row.user_username,
        mobile_number: row.user_mobile_number,
        password_hash: row.user_password_hash,
        role: row.user_role,
        is_active: Boolean(row.user_is_active),
        created_at: row.user_created_at,
        updated_at: row.user_updated_at,
      },
      tenant: {
        id: String(row.tenant_id),
        code: row.tenant_code,
        name: row.tenant_name,
        owner_name: row.tenant_owner_name,
        mobile_number: row.tenant_mobile_number,
        gst_number: row.tenant_gst_number,
        full_address: row.tenant_full_address,
        is_active: Boolean(row.tenant_is_active),
        created_at: row.tenant_created_at,
        updated_at: row.tenant_updated_at,
      },
    };
  }

  async findTenantByNameOrMobile(name: string, mobileNumber: string): Promise<AdminTenantRecord | null> {
    const normalizedName = name.trim().toLowerCase();
    const normalizedMobile = mobileNumber.trim().toLowerCase();
    const tenant = await this.db("tenants")
      .whereRaw("LOWER(COALESCE(name, '')) = ?", [normalizedName])
      .orWhereRaw("LOWER(COALESCE(mobile_number, '')) = ?", [normalizedMobile])
      .first<AdminTenantRecord>();

    return tenant ?? null;
  }

  async createDistributorAdmin(
    input: {
      tenantId: string;
      tenantCode: string;
      distributorName: string;
      ownerName: string;
      mobileNumber: string;
      gstNumber: string;
      fullAddress: string;
      userId: string;
      username: string;
      email: string;
      passwordHash: string;
      role: string;
    },
    trx?: Knex.Transaction,
  ): Promise<AdminAuthRecord> {
    const executor = trx ?? this.db;

    await executor("tenants").insert({
      id: input.tenantId,
      code: input.tenantCode,
      name: input.distributorName,
      owner_name: input.ownerName,
      mobile_number: input.mobileNumber,
      gst_number: input.gstNumber,
      full_address: input.fullAddress,
      is_active: true,
      created_at: executor.fn.now(),
      updated_at: executor.fn.now(),
    });

    await executor("users").insert({
      id: input.userId,
      tenant_id: input.tenantId,
      email: input.email,
      username: input.username,
      mobile_number: input.mobileNumber,
      password_hash: input.passwordHash,
      role: input.role,
      is_active: true,
      created_at: executor.fn.now(),
      updated_at: executor.fn.now(),
    });

    const created = await executor("users")
      .join("tenants", "users.tenant_id", "tenants.id")
      .where("users.id", input.userId)
      .first(
        "users.id as user_id",
        "users.tenant_id as user_tenant_id",
        "users.email as user_email",
        "users.username as user_username",
        "users.mobile_number as user_mobile_number",
        "users.password_hash as user_password_hash",
        "users.role as user_role",
        "users.is_active as user_is_active",
        "users.created_at as user_created_at",
        "users.updated_at as user_updated_at",
        "tenants.id as tenant_id",
        "tenants.code as tenant_code",
        "tenants.name as tenant_name",
        "tenants.owner_name as tenant_owner_name",
        "tenants.mobile_number as tenant_mobile_number",
        "tenants.gst_number as tenant_gst_number",
        "tenants.full_address as tenant_full_address",
        "tenants.is_active as tenant_is_active",
        "tenants.created_at as tenant_created_at",
        "tenants.updated_at as tenant_updated_at",
      );

    return {
      user: {
        id: String(created.user_id),
        tenant_id: String(created.user_tenant_id),
        email: created.user_email,
        username: created.user_username,
        mobile_number: created.user_mobile_number,
        password_hash: created.user_password_hash,
        role: created.user_role,
        is_active: Boolean(created.user_is_active),
        created_at: created.user_created_at,
        updated_at: created.user_updated_at,
      },
      tenant: {
        id: String(created.tenant_id),
        code: created.tenant_code,
        name: created.tenant_name,
        owner_name: created.tenant_owner_name,
        mobile_number: created.tenant_mobile_number,
        gst_number: created.tenant_gst_number,
        full_address: created.tenant_full_address,
        is_active: Boolean(created.tenant_is_active),
        created_at: created.tenant_created_at,
        updated_at: created.tenant_updated_at,
      },
    };
  }
}
