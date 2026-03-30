import crypto from "crypto";
import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";

type RetailerRow = {
  id: string;
  tenant_id: string;
  name: string;
  owner_name?: string | null;
  phone: string;
  gst_number?: string | null;
  address_line1?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

type RetailerTenantRow = RetailerRow & {
  linked_at: string | Date;
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

type AdminRetailerAggregateRow = {
  id: string;
  name: string;
  phone: string;
  owner_name?: string | null;
  gst_number?: string | null;
  address_line1?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  linked_at: string | Date;
  last_order_date?: string | Date | null;
  total_orders?: number | string | null;
  total_value?: number | string | null;
};

type AdminRetailerRecentOrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number | string | null;
  created_at: string | Date;
};

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

export type AdminRetailerListFilters = {
  search?: string;
  page: number;
  limit: number;
};

export type AdminRetailerListItem = {
  id: string;
  name: string;
  phone: string;
  linked_at: string;
  last_order_date: string | null;
  total_orders: number;
  total_value: number;
};

export type AdminRetailerListResult = {
  items: AdminRetailerListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export type AdminRetailerProfile = {
  id: string;
  name: string;
  phone: string;
  owner_name: string | null;
  gst_number: string | null;
  address_line1: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  linked_at: string;
};

export type AdminRetailerSummary = {
  last_order_date: string | null;
  total_orders: number;
  total_value: number;
};

export type AdminRetailerRecentOrder = {
  id: string;
  order_number: string;
  status: string;
  total_amount_paise: number;
  created_at: string;
};

export type AdminRetailerDetail = {
  retailer: AdminRetailerProfile;
  summary: AdminRetailerSummary;
  recent_orders: AdminRetailerRecentOrder[];
};

const normalizeOptional = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const toIsoString = (value: string | Date) => new Date(value).toISOString();

const toIsoStringOrNull = (value?: string | Date | null) => (value ? new Date(value).toISOString() : null);

const toNumber = (value: string | number | null | undefined) => Number(value ?? 0);

const decimalRupeesToPaise = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }

  const normalized = typeof value === "number" ? value.toFixed(2) : String(value);
  const [wholePart, decimalPart = ""] = normalized.split(".");
  const isNegative = wholePart.startsWith("-");
  const wholeDigits = wholePart.replace("-", "");
  const paise = Number(wholeDigits || "0") * 100 + Number((decimalPart + "00").slice(0, 2));

  return isNegative ? -paise : paise;
};

export class RetailerRepository extends BaseRepository {
  async findByMobileNumber(tenantId: string, mobileNumber: string, excludeId?: string): Promise<RetailerRecord | null> {
    const query = this.baseTenantRetailerQuery(tenantId).where("retailers.phone", mobileNumber.trim());

    if (excludeId) {
      query.whereNot("retailers.id", excludeId);
    }

    const retailer = await query.first<RetailerTenantRow>();
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
    const rows = await this.baseTenantRetailerQuery(tenantId).orderBy("retailer_distributor_links.created_at", "desc");

    return rows.map((row) => this.mapTenantRetailer(row));
  }

  async listAdminRetailers(tenantId: string, filters: AdminRetailerListFilters): Promise<AdminRetailerListResult> {
    const totalRow = await this.baseAdminRetailerCountQuery(tenantId, filters.search)
      .countDistinct<{ count: string }>({ count: "retailers.id" })
      .first();

    const total = Number(totalRow?.count ?? 0);
    const items = await this.baseAdminRetailerAggregateQuery(tenantId, filters.search)
      .orderBy("retailer_distributor_links.created_at", "desc")
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);
    const itemRows = items as AdminRetailerAggregateRow[];

    return {
      items: itemRows.map((row) => this.mapAdminRetailerListItem(row)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        total_pages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
    };
  }

  async findById(tenantId: string, id: string): Promise<RetailerRecord | null> {
    const retailer = await this.baseTenantRetailerQuery(tenantId).where("retailers.id", id).first<RetailerTenantRow>();

    return retailer ? this.mapTenantRetailer(retailer) : null;
  }

  async findAdminRetailerDetailById(tenantId: string, retailerId: string): Promise<AdminRetailerDetail | null> {
    const aggregateRow = await this.baseAdminRetailerAggregateQuery(tenantId)
      .where("retailers.id", retailerId)
      .first<AdminRetailerAggregateRow>();

    if (!aggregateRow) {
      return null;
    }

    const recentOrderRows = await this.db("orders")
      .where({
        tenant_id: tenantId,
        retailer_id: retailerId,
      })
      .orderBy("created_at", "desc")
      .limit(5)
      .select<AdminRetailerRecentOrderRow[]>("id", "order_number", "status", "total_amount", "created_at");

    return {
      retailer: this.mapAdminRetailerProfile(aggregateRow),
      summary: this.mapAdminRetailerSummary(aggregateRow),
      recent_orders: recentOrderRows.map((row) => this.mapAdminRetailerRecentOrder(row)),
    };
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

  private baseAdminRetailerCountQuery(tenantId: string, search?: string) {
    const query = this.db("retailer_distributor_links")
      .join("retailers", "retailer_distributor_links.retailer_id", "retailers.id")
      .where("retailer_distributor_links.tenant_id", tenantId)
      .andWhere("retailers.is_active", true);

    return this.applyAdminRetailerSearch(query, search);
  }

  private baseAdminRetailerAggregateQuery(tenantId: string, search?: string) {
    const query = this.db("retailer_distributor_links")
      .join("retailers", "retailer_distributor_links.retailer_id", "retailers.id")
      .leftJoin("orders", function joinOrders() {
        this.on("orders.retailer_id", "=", "retailer_distributor_links.retailer_id").andOn(
          "orders.tenant_id",
          "=",
          "retailer_distributor_links.tenant_id",
        );
      })
      .where("retailer_distributor_links.tenant_id", tenantId)
      .andWhere("retailers.is_active", true)
      .groupBy(
        "retailers.id",
        "retailers.name",
        "retailers.phone",
        "retailers.owner_name",
        "retailers.gst_number",
        "retailers.address_line1",
        "retailers.locality",
        "retailers.city",
        "retailers.state",
        "retailers.pincode",
        "retailer_distributor_links.created_at",
      )
      .select(
        "retailers.id",
        "retailers.name",
        "retailers.phone",
        "retailers.owner_name",
        "retailers.gst_number",
        "retailers.address_line1",
        "retailers.locality",
        "retailers.city",
        "retailers.state",
        "retailers.pincode",
        "retailer_distributor_links.created_at as linked_at",
      )
      .count<{ total_orders: string }>({ total_orders: "orders.id" })
      .max<{ last_order_date: string | Date | null }>({ last_order_date: "orders.created_at" })
      .sum<{ total_value: string | null }>({ total_value: "orders.total_amount" });

    return this.applyAdminRetailerSearch(query, search);
  }

  private applyAdminRetailerSearch<TRecord extends {}, TResult>(query: Knex.QueryBuilder<TRecord, TResult>, search?: string) {
    const trimmedSearch = search?.trim();
    if (!trimmedSearch) {
      return query;
    }

    const searchTerm = `%${trimmedSearch}%`;

    return query.andWhere(function searchBuilder(this: Knex.QueryBuilder) {
      this.where("retailers.name", "ilike", searchTerm).orWhere("retailers.phone", "ilike", searchTerm);
    });
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

    await this.db("retailers").where({ id }).update(updatePayload);
  }

  private mapTenantRetailer(row: RetailerTenantRow): RetailerRecord {
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
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
    };
  }

  private mapAdminRetailerListItem(row: AdminRetailerAggregateRow): AdminRetailerListItem {
    return {
      id: String(row.id),
      name: row.name,
      phone: row.phone,
      linked_at: toIsoString(row.linked_at),
      last_order_date: toIsoStringOrNull(row.last_order_date),
      total_orders: toNumber(row.total_orders),
      total_value: decimalRupeesToPaise(row.total_value),
    };
  }

  private mapAdminRetailerProfile(row: AdminRetailerAggregateRow): AdminRetailerProfile {
    return {
      id: String(row.id),
      name: row.name,
      phone: row.phone,
      owner_name: row.owner_name ?? null,
      gst_number: row.gst_number ?? null,
      address_line1: row.address_line1 ?? null,
      locality: row.locality ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      pincode: row.pincode ?? null,
      linked_at: toIsoString(row.linked_at),
    };
  }

  private mapAdminRetailerSummary(row: AdminRetailerAggregateRow): AdminRetailerSummary {
    return {
      last_order_date: toIsoStringOrNull(row.last_order_date),
      total_orders: toNumber(row.total_orders),
      total_value: decimalRupeesToPaise(row.total_value),
    };
  }

  private mapAdminRetailerRecentOrder(row: AdminRetailerRecentOrderRow): AdminRetailerRecentOrder {
    return {
      id: String(row.id),
      order_number: row.order_number,
      status: row.status,
      total_amount_paise: decimalRupeesToPaise(row.total_amount),
      created_at: toIsoString(row.created_at),
    };
  }
}
