import crypto from "crypto";

import { BaseRepository } from "../../shared/base-repository";

export type RetailerRecord = {
  id: string;
  tenant_id: string;
  name: string;
  owner_name: string | null;
  mobile_number: string;
  gst_number: string | null;
  address_line1: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type GlobalRetailerRecord = {
  id: string;
  phone: string;
  name: string;
  owner_name: string | null;
  gst_number: string | null;
  address_line1: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RetailerCreateInput = {
  name: string;
  owner_name?: string;
  mobile_number: string;
  gst_number?: string;
  address_line1?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export type RetailerUpdateInput = Partial<RetailerCreateInput>;

const normalizeOptional = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export class RetailerRepository extends BaseRepository {
  async findByMobileNumber(tenantId: string, mobileNumber: string, excludeId?: string): Promise<RetailerRecord | null> {
    const query = this.baseTenantRetailerQuery(tenantId)
      .where("retailers.phone", mobileNumber.trim());

    if (excludeId) {
      query.whereNot("retailers.id", excludeId);
    }

    const retailer = await query.first();
    return retailer ? this.mapTenantRetailer(retailer) : null;
  }

  async findGlobalByMobileNumber(mobileNumber: string): Promise<GlobalRetailerRecord | null> {
    const retailer = await this.db("retailers")
      .where({
        phone: mobileNumber.trim(),
      })
      .first<GlobalRetailerRecord>(
        "id",
        "phone",
        "name",
        "owner_name",
        "gst_number",
        "address_line1",
        "locality",
        "city",
        "state",
        "pincode",
        "is_active",
        "created_at",
        "updated_at",
      );

    return retailer ?? null;
  }

  async create(tenantId: string, input: RetailerCreateInput): Promise<RetailerRecord> {
    const existingGlobal = await this.findGlobalByMobileNumber(input.mobile_number);
    const retailerId = existingGlobal?.id ?? crypto.randomUUID();

    if (!existingGlobal) {
      await this.db("retailers").insert({
        id: retailerId,
        phone: input.mobile_number.trim(),
        name: input.name.trim(),
        owner_name: normalizeOptional(input.owner_name),
        gst_number: normalizeOptional(input.gst_number),
        address_line1: normalizeOptional(input.address_line1),
        locality: normalizeOptional(input.locality),
        city: normalizeOptional(input.city),
        state: normalizeOptional(input.state),
        pincode: normalizeOptional(input.pincode),
        is_active: true,
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
    } else {
      await this.updateGlobalRetailer(retailerId, input);
    }

    await this.db("retailer_distributor_links")
      .insert({
        id: crypto.randomUUID(),
        retailer_id: retailerId,
        tenant_id: tenantId,
        created_at: this.db.fn.now(),
      })
      .onConflict(["retailer_id", "tenant_id"])
      .ignore();

    return this.findById(tenantId, retailerId) as Promise<RetailerRecord>;
  }

  async listByTenant(tenantId: string): Promise<RetailerRecord[]> {
    const rows = await this.baseTenantRetailerQuery(tenantId)
      .orderBy("retailer_distributor_links.created_at", "desc");

    return rows.map((row) => this.mapTenantRetailer(row));
  }

  async findById(tenantId: string, id: string): Promise<RetailerRecord | null> {
    const retailer = await this.baseTenantRetailerQuery(tenantId)
      .where("retailers.id", id)
      .first();

    return retailer ? this.mapTenantRetailer(retailer) : null;
  }

  async update(tenantId: string, id: string, input: RetailerUpdateInput): Promise<RetailerRecord | null> {
    const existing = await this.findById(tenantId, id);
    if (!existing) {
      return null;
    }

    await this.updateGlobalRetailer(id, input);
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string): Promise<RetailerRecord | null> {
    const existing = await this.findById(tenantId, id);
    if (!existing) {
      return null;
    }

    await this.db("retailer_distributor_links")
      .where({
        retailer_id: id,
        tenant_id: tenantId,
      })
      .delete();

    const remainingLinks = await this.db("retailer_distributor_links")
      .where({ retailer_id: id })
      .count<{ count: string }>({ count: "*" })
      .first();

    if (Number(remainingLinks?.count ?? 0) === 0) {
      await this.db("retailers")
        .where({ id })
        .update({
          is_active: false,
          updated_at: this.db.fn.now(),
        });
    }

    return {
      ...existing,
      is_active: false,
    };
  }

  private baseTenantRetailerQuery(tenantId: string) {
    return this.db("retailer_distributor_links")
      .join("retailers", "retailer_distributor_links.retailer_id", "retailers.id")
      .where("retailer_distributor_links.tenant_id", tenantId)
      .andWhere("retailers.is_active", true)
      .select(
        "retailers.id",
        "retailer_distributor_links.tenant_id",
        "retailers.name",
        "retailers.owner_name",
        "retailers.phone",
        "retailers.gst_number",
        "retailers.address_line1",
        "retailers.locality",
        "retailers.city",
        "retailers.state",
        "retailers.pincode",
        "retailers.is_active",
        "retailers.created_at",
        "retailers.updated_at",
        "retailer_distributor_links.created_at as linked_at",
      );
  }

  private async updateGlobalRetailer(id: string, input: RetailerUpdateInput) {
    const updatePayload: Record<string, unknown> = {
      updated_at: this.db.fn.now(),
    };

    if ("name" in input && input.name !== undefined) {
      updatePayload.name = input.name.trim();
    }
    if ("owner_name" in input) {
      updatePayload.owner_name = normalizeOptional(input.owner_name);
    }
    if ("mobile_number" in input && input.mobile_number !== undefined) {
      updatePayload.phone = input.mobile_number.trim();
    }
    if ("gst_number" in input) {
      updatePayload.gst_number = normalizeOptional(input.gst_number);
    }
    if ("address_line1" in input) {
      updatePayload.address_line1 = normalizeOptional(input.address_line1);
    }
    if ("locality" in input) {
      updatePayload.locality = normalizeOptional(input.locality);
    }
    if ("city" in input) {
      updatePayload.city = normalizeOptional(input.city);
    }
    if ("state" in input) {
      updatePayload.state = normalizeOptional(input.state);
    }
    if ("pincode" in input) {
      updatePayload.pincode = normalizeOptional(input.pincode);
    }

    await this.db("retailers")
      .where({ id })
      .update(updatePayload);
  }

  private mapTenantRetailer(row: any): RetailerRecord {
    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      name: row.name,
      owner_name: row.owner_name ?? null,
      mobile_number: row.phone,
      gst_number: row.gst_number ?? null,
      address_line1: row.address_line1 ?? null,
      locality: row.locality ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      pincode: row.pincode ?? null,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
