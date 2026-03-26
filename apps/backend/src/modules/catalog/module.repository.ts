import { BaseRepository } from "../../shared/base-repository";

export class CatalogRepository extends BaseRepository {
  async listBrands(tenantId: string) {
    return this.db("tenant_products")
      .leftJoin("global_brands", "tenant_products.brand_id", "global_brands.id")
      .where("tenant_products.tenant_id", tenantId)
      .where("tenant_products.status", "active")
      .groupBy("global_brands.id", "global_brands.name")
      .select(
        "global_brands.id",
        "global_brands.name",
        this.db.raw("COUNT(tenant_products.id) as sku_count"),
      )
      .orderBy("global_brands.name", "asc");
  }

  async listProductsByBrand(tenantId: string, brandId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const baseQuery = this.db("tenant_products")
      .leftJoin("global_brands", "tenant_products.brand_id", "global_brands.id")
      .leftJoin("tenant_product_schemes", "tenant_product_schemes.tenant_product_id", "tenant_products.id")
      .where("tenant_products.tenant_id", tenantId)
      .where("tenant_products.brand_id", brandId)
      .where("tenant_products.status", "active");

    const items = await baseQuery
      .clone()
      .offset(offset)
      .limit(pageSize)
      .select(
        "tenant_products.id",
        "tenant_products.brand_id",
        "tenant_products.product_name as name",
        "global_brands.name as brand_name",
        "tenant_products.pack_size",
        "tenant_products.base_price",
        "tenant_products.advance_price",
        "tenant_product_schemes.scheme_text as scheme_tag",
      );

    const countRow = await baseQuery.clone().count<{ count: string }[]>({ count: "*" }).first();
    return {
      items,
      totalCount: Number(countRow?.count ?? 0),
    };
  }

  async searchProducts(tenantId: string, search: string, limit: number) {
    const term = `%${search}%`;

    return this.db("tenant_products")
      .leftJoin("global_brands", "tenant_products.brand_id", "global_brands.id")
      .where("tenant_products.tenant_id", tenantId)
      .where("tenant_products.status", "active")
      .where((queryBuilder) => {
        queryBuilder
          .where("tenant_products.product_name", "like", term)
          .orWhere("tenant_products.sku_code", "like", term)
          .orWhere("global_brands.name", "like", term);
      })
      .limit(limit)
      .select(
        "tenant_products.id",
        "tenant_products.brand_id",
        "tenant_products.product_name as name",
        "global_brands.name as brand_name",
        "tenant_products.pack_size",
        "tenant_products.base_price",
        "tenant_products.advance_price",
      );
  }

  async getProductById(tenantId: string, productId: string) {
    return this.db("tenant_products")
      .leftJoin("global_brands", "tenant_products.brand_id", "global_brands.id")
      .where("tenant_products.tenant_id", tenantId)
      .where("tenant_products.id", productId)
      .first(
        "tenant_products.id",
        "tenant_products.brand_id",
        "tenant_products.product_name as name",
        "global_brands.name as brand_name",
        "tenant_products.pack_size",
        "tenant_products.base_price",
        "tenant_products.advance_price",
      );
  }

  async getLatestStockMap(tenantId: string, productIds: string[]) {
    const rows = await this.db("tenant_product_stock_snapshots")
      .where("tenant_id", tenantId)
      .whereIn("tenant_product_id", productIds)
      .orderBy("tenant_product_id", "asc")
      .orderBy("captured_at", "desc")
      .select("tenant_product_id", "stock_qty");

    const stockMap: Record<string, number> = {};
    for (const row of rows) {
      const key = String(row.tenant_product_id);
      if (!(key in stockMap)) {
        stockMap[key] = Number(row.stock_qty ?? 0);
      }
    }

    return stockMap;
  }
}
