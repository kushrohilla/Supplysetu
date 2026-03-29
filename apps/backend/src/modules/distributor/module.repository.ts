import { BaseRepository } from "../../shared/base-repository";

type TenantRecord = {
  id: string | number;
  name: string;
  service_city?: string | null;
  address_city?: string | null;
  distributor_logo_url?: string | null;
};

export const resolveDistributorTenantColumns = (tenantColumnNames: string[]) => ({
  logoColumn: tenantColumnNames.includes("distributor_logo_url") ? "tenants.distributor_logo_url" : null,
  cityColumn: tenantColumnNames.includes("service_city") ? "tenants.service_city" : null,
});

export class DistributorRepository extends BaseRepository {
  private tenantColumnNamesPromise: Promise<string[]> | null = null;

  private getTenantColumnNames() {
    if (!this.tenantColumnNamesPromise) {
      this.tenantColumnNamesPromise = this.db("tenants")
        .columnInfo()
        .then((columns) => Object.keys(columns));
    }

    return this.tenantColumnNamesPromise;
  }

  async getTenantIdsForRetailer(retailerId: string): Promise<string[]> {
    const links = await this.db("retailer_distributor_links")
      .where({ retailer_id: retailerId })
      .select("tenant_id");

    return links.map((link) => String(link.tenant_id));
  }

  async ensureRetailerTenantLinks(retailerId: string): Promise<string[]> {
    return this.getTenantIdsForRetailer(retailerId);
  }

  async assertRetailerTenantLink(retailerId: string, tenantId: string) {
    const link = await this.db("retailer_distributor_links")
      .where({
        retailer_id: retailerId,
        tenant_id: tenantId,
      })
      .first("id", "retailer_id", "tenant_id", "created_at");

    return link ?? null;
  }

  async listDistributors(retailerId: string) {
    const tenantColumnNames = await this.getTenantColumnNames();
    const { logoColumn, cityColumn } = resolveDistributorTenantColumns(tenantColumnNames);

    return this.db("retailer_distributor_links")
      .join("tenants", "retailer_distributor_links.tenant_id", "tenants.id")
      .where("retailer_distributor_links.retailer_id", retailerId)
      .select(
        "tenants.id as id",
        "tenants.name",
        logoColumn ? `${logoColumn} as logo_url` : this.db.raw("null as logo_url"),
        cityColumn ? `${cityColumn} as city` : this.db.raw("null as city"),
      );
  }

  async getRetailerHome(retailerId: string, tenantId: string) {
    const tenant = await this.db("tenants").where({ id: tenantId }).first<TenantRecord>();
    const orders = await this.db("orders")
      .where({ retailer_id: retailerId, tenant_id: tenantId })
      .orderBy("created_at", "desc");

    const ordersPlacedTodayCount = orders.filter((order) => {
      const createdAt = new Date(order.created_at);
      const now = new Date();
      return createdAt.toDateString() === now.toDateString();
    }).length;

    return {
      assignedRouteName: `${tenant?.name ?? "Distributor"} Route`,
      totalRetailersInRoute: 1,
      retailersYetToVisitCount: Math.max(0, 5 - ordersPlacedTodayCount),
      ordersPlacedTodayCount,
      inactiveRetailersCount: 0,
      activeScheme: {
        title: "Scheme of the day",
        description: "Catalogue and pricing data are served from backend modules.",
      },
      visitPreview: [
        {
          id: String(retailerId),
          retailerName: "Current Retailer",
          locality: tenant?.service_city ?? tenant?.address_city ?? "Local route",
          state: ordersPlacedTodayCount > 0 ? "order-placed" : "yet-to-visit",
          note: ordersPlacedTodayCount > 0 ? "Recent order captured from backend" : "Ready for assisted ordering",
        },
      ],
    };
  }
}
