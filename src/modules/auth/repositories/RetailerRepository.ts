import { Knex } from "knex";
import { Retailer, AuthTokenResponse } from "../../../shared/types/retailer-ordering";

export class RetailerRepository {
  constructor(private db: Knex) {}

  /**
   * Find retailer by phone
   */
  async findByPhone(phone: string): Promise<Retailer | null> {
    const retailer = await this.db("retailers")
      .where({ phone })
      .first();
    return retailer || null;
  }

  /**
   * Find retailer by ID
   */
  async findById(id: number): Promise<Retailer | null> {
    const retailer = await this.db("retailers")
      .where({ id })
      .first();
    return retailer || null;
  }

  /**
   * Create new retailer
   */
  async create(data: Partial<Retailer>): Promise<Retailer> {
    const [id] = await this.db("retailers").insert(data);
    return this.findById(id) as Promise<Retailer>;
  }

  /**
   * Update retailer
   */
  async update(id: number, data: Partial<Retailer>): Promise<void> {
    await this.db("retailers")
      .where({ id })
      .update({ ...data, updated_at: this.db.fn.now() });
  }

  /**
   * Get distributors for retailer (with order history)
   */
  async getConnectedDistributors(retailerId: number) {
    return this.db("retailer_distributor_links")
      .join("tenants", "retailer_distributor_links.tenant_id", "tenants.id")
      .where("retailer_distributor_links.retailer_id", retailerId)
      .where("retailer_distributor_links.status", "active")
      .orderByRaw("retailer_distributor_links.last_ordered_at DESC NULLS LAST")
      .select(
        "tenants.id as tenant_id",
        "tenants.name",
        "tenants.domain as logo_url",
        "tenants.address_city as city",
        "retailer_distributor_links.last_ordered_at",
        "retailer_distributor_links.total_orders"
      );
  }

  /**
   * Get tenant IDs for retailer (for JWT token)
   */
  async getTenantIds(retailerId: number): Promise<number[]> {
    const links = await this.db("retailer_distributor_links")
      .where("retailer_id", retailerId)
      .where("status", "active")
      .select("tenant_id");
    return links.map((l) => l.tenant_id);
  }

  /**
   * Link retailer to distributor/tenant
   */
  async linkToDistributor(
    retailerId: number,
    tenantId: number,
    referralCode?: string
  ): Promise<void> {
    await this.db("retailer_distributor_links")
      .insert({
        retailer_id: retailerId,
        tenant_id: tenantId,
        referral_code: referralCode,
        status: "active",
      })
      .onConflict(["retailer_id", "tenant_id"])
      .merge();
  }
}
