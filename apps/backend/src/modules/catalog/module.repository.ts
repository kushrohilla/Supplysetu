import crypto from "crypto";
import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";

export class CatalogRepository extends BaseRepository {
  private getDefaultBrandSource(tenantId: string) {
    return `tenant-default:${tenantId}`;
  }

  async listBrands(tenantId: string) {
    const tenantIdBinding = this.db.raw("?", [tenantId]);
    const activeStatusBinding = this.db.raw("?", ["active"]);
    const defaultBrandSource = this.getDefaultBrandSource(tenantId);

    return this.db("global_brands")
      .leftJoin("tenant_products", function joinTenantProducts() {
        this.on("global_brands.id", "tenant_products.brand_id")
          .andOn("tenant_products.tenant_id", "=", tenantIdBinding)
          .andOn("tenant_products.status", "=", activeStatusBinding);
      })
      .where("global_brands.is_active", true)
      .andWhere((queryBuilder) => {
        queryBuilder
          .whereRaw("global_brands.source NOT LIKE 'tenant-default:%'")
          .orWhere("global_brands.source", defaultBrandSource);
      })
      .groupBy("global_brands.id", "global_brands.name", "global_brands.updated_at")
      .select(
        "global_brands.id",
        "global_brands.name",
        "global_brands.updated_at",
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

  async findBrandByName(name: string, tenantId?: string) {
    const query = this.db("global_brands")
      .whereRaw("LOWER(name) = ?", [name.trim().toLowerCase()]);

    if (tenantId) {
      query.andWhere((queryBuilder) => {
        queryBuilder
          .whereRaw("global_brands.source NOT LIKE 'tenant-default:%'")
          .orWhere("global_brands.source", this.getDefaultBrandSource(tenantId));
      });
    } else {
      query.andWhereRaw("global_brands.source NOT LIKE 'tenant-default:%'");
    }

    return query.first("id", "name", "updated_at");
  }

  async createBrand(name: string) {
    const brand = {
      id: crypto.randomUUID(),
      name: name.trim(),
      source: "admin-web",
      is_active: true,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    };

    await this.db("global_brands").insert(brand);

    return this.db("global_brands")
      .where({ id: brand.id })
      .first("id", "name", "updated_at");
  }

  async findDefaultBrandForTenant(tenantId: string) {
    return this.db("global_brands")
      .where({
        name: "General",
        source: this.getDefaultBrandSource(tenantId),
      })
      .first("id", "name", "updated_at");
  }

  async createDefaultBrandForTenant(tenantId: string, name: string) {
    const brand = {
      id: crypto.randomUUID(),
      name: name.trim(),
      source: this.getDefaultBrandSource(tenantId),
      is_active: true,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    };

    await this.db("global_brands")
      .insert(brand)
      .onConflict(["name", "source"])
      .ignore();

    return this.db("global_brands")
      .where({
        name: brand.name,
        source: brand.source,
      })
      .first("id", "name", "updated_at");
  }

  async createTenantProducts(
    tenantId: string,
    products: Array<{
      brandId: string;
      productName: string;
      variantPackSize: string;
      baseSellingPrice: number;
      mrp: number;
      openingStock: number;
      isActive: boolean;
    }>,
  ) {
    return this.db.transaction(async (trx: Knex.Transaction) => {
      const createdProducts: Array<{
        id: string;
        brand_id: string;
        brand_name?: string | null;
        name: string;
        pack_size: string;
        base_price: number;
        advance_price: number;
      }> = [];

      for (const product of products) {
        const tenantProductId = crypto.randomUUID();
        const skuCode = `SKU-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        await trx("tenant_products").insert({
          id: tenantProductId,
          tenant_id: tenantId,
          brand_id: product.brandId,
          product_name: product.productName.trim(),
          pack_size: product.variantPackSize.trim(),
          sku_code: skuCode,
          base_price: product.baseSellingPrice,
          advance_price: product.baseSellingPrice,
          status: product.isActive ? "active" : "inactive",
          performance_band: "new",
          opening_stock_snapshot: product.openingStock,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

        await trx("tenant_product_stock_snapshots").insert({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          tenant_product_id: tenantProductId,
          stock_qty: product.openingStock,
          source: "admin-web",
          captured_at: trx.fn.now(),
          created_at: trx.fn.now(),
        });

        const created = await trx("tenant_products")
          .leftJoin("global_brands", "tenant_products.brand_id", "global_brands.id")
          .where("tenant_products.id", tenantProductId)
          .first(
            "tenant_products.id",
            "tenant_products.brand_id",
            "tenant_products.product_name as name",
            "tenant_products.pack_size",
            "tenant_products.base_price",
            "tenant_products.advance_price",
            "global_brands.name as brand_name",
          );

        if (created) {
          createdProducts.push(created);
        }
      }

      return createdProducts;
    });
  }
}
