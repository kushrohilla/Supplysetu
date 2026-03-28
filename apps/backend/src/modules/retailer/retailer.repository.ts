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
    const query = this.db("retailers")
      .where({
        tenant_id: tenantId,
        mobile_number: mobileNumber.trim(),
      });

    if (excludeId) {
      query.whereNot("id", excludeId);
    }

    const retailer = await query.first<RetailerRecord>(
      "id",
      "tenant_id",
      "name",
      "owner_name",
      "mobile_number",
      "gst_number",
      "address_line1",
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
    const id = crypto.randomUUID();

    await this.db("retailers").insert({
      id,
      tenant_id: tenantId,
      name: input.name.trim(),
      owner_name: normalizeOptional(input.owner_name),
      mobile_number: input.mobile_number.trim(),
      gst_number: normalizeOptional(input.gst_number),
      address_line1: normalizeOptional(input.address_line1),
      city: normalizeOptional(input.city),
      state: normalizeOptional(input.state),
      pincode: normalizeOptional(input.pincode),
      is_active: true,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    return this.findById(tenantId, id) as Promise<RetailerRecord>;
  }

  async listByTenant(tenantId: string): Promise<RetailerRecord[]> {
    return this.db("retailers")
      .where({
        tenant_id: tenantId,
        is_active: true,
      })
      .orderBy("created_at", "desc")
      .select<RetailerRecord[]>(
        "id",
        "tenant_id",
        "name",
        "owner_name",
        "mobile_number",
        "gst_number",
        "address_line1",
        "city",
        "state",
        "pincode",
        "is_active",
        "created_at",
        "updated_at",
      );
  }

  async findById(tenantId: string, id: string): Promise<RetailerRecord | null> {
    const retailer = await this.db("retailers")
      .where({
        id,
        tenant_id: tenantId,
        is_active: true,
      })
      .first<RetailerRecord>(
        "id",
        "tenant_id",
        "name",
        "owner_name",
        "mobile_number",
        "gst_number",
        "address_line1",
        "city",
        "state",
        "pincode",
        "is_active",
        "created_at",
        "updated_at",
      );

    return retailer ?? null;
  }

  async update(tenantId: string, id: string, input: RetailerUpdateInput): Promise<RetailerRecord | null> {
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
      updatePayload.mobile_number = input.mobile_number.trim();
    }
    if ("gst_number" in input) {
      updatePayload.gst_number = normalizeOptional(input.gst_number);
    }
    if ("address_line1" in input) {
      updatePayload.address_line1 = normalizeOptional(input.address_line1);
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

    const updatedCount = await this.db("retailers")
      .where({
        id,
        tenant_id: tenantId,
        is_active: true,
      })
      .update(updatePayload);

    if (!updatedCount) {
      return null;
    }

    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string): Promise<RetailerRecord | null> {
    const existing = await this.db("retailers")
      .where({
        id,
        tenant_id: tenantId,
        is_active: true,
      })
      .first<RetailerRecord>(
        "id",
        "tenant_id",
        "name",
        "owner_name",
        "mobile_number",
        "gst_number",
        "address_line1",
        "city",
        "state",
        "pincode",
        "is_active",
        "created_at",
        "updated_at",
      );

    if (!existing) {
      return null;
    }

    await this.db("retailers")
      .where({
        id,
        tenant_id: tenantId,
        is_active: true,
      })
      .update({
        is_active: false,
        updated_at: this.db.fn.now(),
      });

    return {
      ...existing,
      is_active: false,
    };
  }
}
