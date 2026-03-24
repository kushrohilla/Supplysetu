import { Knex } from "knex";

export class CatalogueRepository {
  constructor(private db: Knex) {}

  /**
   * Get all brands for a tenant
   * Optimized: returns only brand names and count
   */
  async getBrands(tenantId: number) {
    return this.db("tenant_products")
      .where({ tenant_id: tenantId, active: true })
      .join("global_products", "tenant_products.product_id", "global_products.id")
      .join("global_brands", "global_products.brand_id", "global_brands.id")
      .groupBy("global_brands.id")
      .select(
        "global_brands.id",
        "global_brands.name",
        "global_brands.logo_url",
        this.db.raw("COUNT(tenant_products.id) as product_count")
      )
      .orderBy("global_brands.name");
  }

  /**
   * Get products for a brand (paginated, lazy-load safe)
   * Max 30 items per request for bandwidth optimization
   */
  async getProductsByBrand(tenantId: number, brandId: number, page = 1, pageSize = 30) {
    const offset = (page - 1) * pageSize;

    const products = await this.db("tenant_products")
      .where({
        tenant_id: tenantId,
        active: true,
      })
      .join("global_products", "tenant_products.product_id", "global_products.id")
      .join("global_brands", "global_products.brand_id", "global_brands.id")
      .where("global_brands.id", brandId)
      .offset(offset)
      .limit(pageSize)
      .select(
        "tenant_products.id",
        "tenant_products.sku",
        "global_products.name",
        "global_products.pack_size",
        "tenant_products.base_price",
        "tenant_products.advance_price",
        "global_products.image_url"
      );

    const [{ count }] = await this.db("tenant_products")
      .where({
        tenant_id: tenantId,
        active: true,
      })
      .join("global_products", "tenant_products.product_id", "global_products.id")
      .join("global_brands", "global_products.brand_id", "global_brands.id")
      .where("global_brands.id", brandId)
      .count("*");

    return {
      products,
      page,
      page_size: pageSize,
      total_count: count,
      has_more: offset + pageSize < Number(count),
    };
  }

  /**
   * Search products across all brands (debounce-safe)
   */
  async searchProducts(tenantId: number, query: string, limit = 30) {
    const searchTerm = `%${query}%`;

    return this.db("tenant_products")
      .where({
        tenant_id: tenantId,
        active: true,
      })
      .join("global_products", "tenant_products.product_id", "global_products.id")
      .join("global_brands", "global_products.brand_id", "global_brands.id")
      .where((qb) => {
        qb.where("global_products.name", "like", searchTerm)
          .orWhere("tenant_products.sku", "like", searchTerm)
          .orWhere("global_brands.name", "like", searchTerm);
      })
      .limit(limit)
      .select(
        "tenant_products.id",
        "tenant_products.sku",
        "global_products.name",
        "global_products.pack_size",
        "global_brands.name as brand_name",
        "tenant_products.base_price",
        "tenant_products.advance_price",
        "global_products.image_url"
      );
  }

  /**
   * Get product details with scheme info and current stock
   */
  async getProductDetail(tenantId: number, productId: number) {
    const product = await this.db("tenant_products")
      .where({
        id: productId,
        tenant_id: tenantId,
        active: true,
      })
      .join("global_products", "tenant_products.product_id", "global_products.id")
      .join("global_brands", "global_products.brand_id", "global_brands.id")
      .first()
      .select(
        "tenant_products.*",
        "global_products.name",
        "global_products.pack_size",
        "global_products.description",
        "global_brands.name as brand_name",
        "global_products.image_url"
      );

    if (!product) return null;

    // Get active schemes
    const schemes = await this.db("tenant_product_schemes")
      .where({
        tenant_id: tenantId,
        product_id: productId,
      })
      .where("valid_until", ">=", this.db.fn.now())
      .select("code", "description", "discount_percent");

    // Get current stock
    const stock = await this.db("tenant_product_stock_snapshots")
      .where({
        tenant_id: tenantId,
        product_id: productId,
      })
      .orderBy("snapshot_date", "desc")
      .first()
      .select("available_quantity", "snapshot_date");

    return {
      ...product,
      schemes,
      current_stock: stock?.available_quantity || 0,
      stock_last_updated: stock?.snapshot_date,
    };
  }

  /**
   * Get stock for multiple products (for cart validation)
   */
  async getStockBatch(tenantId: number, productIds: number[]): Promise<Record<number, number>> {
    const stocks = await this.db("tenant_product_stock_snapshots")
      .where("tenant_id", tenantId)
      .whereIn("product_id", productIds)
      .orderBy("product_id")
      .orderBy("snapshot_date", "desc")
      .select("product_id", "available_quantity");

    // Get latest for each product
    const latest: Record<number, number> = {};
    const seen = new Set<number>();

    for (const stock of stocks) {
      if (!seen.has(stock.product_id)) {
        latest[stock.product_id] = stock.available_quantity;
        seen.add(stock.product_id);
      }
    }

    return latest;
  }
}
