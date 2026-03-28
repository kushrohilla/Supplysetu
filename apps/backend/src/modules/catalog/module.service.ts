import type { CatalogRepository } from "./module.repository";

const DEFAULT_BRAND_NAME = "General";

export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async getBrands(tenantId: string) {
    const brands = await this.catalogRepository.listBrands(tenantId);
    return brands.map((brand) => ({
      id: String(brand.id),
      name: brand.name,
      totalProductCount: Number(brand.sku_count ?? 0),
      skuCount: Number(brand.sku_count ?? 0),
      updatedAt: brand.updated_at ? new Date(brand.updated_at).toISOString() : new Date().toISOString(),
    }));
  }

  async getProductsByBrand(tenantId: string, brandId: string, page: number, pageSize: number) {
    const result = await this.catalogRepository.listProductsByBrand(tenantId, brandId, page, pageSize);
    return {
      items: result.items.map((product) => ({
        id: String(product.id),
        brandId: String(product.brand_id),
        brandName: product.brand_name ?? "Unknown",
        name: product.name,
        packSize: product.pack_size,
        basePrice: Number(product.base_price),
        advancePrice: Number(product.advance_price ?? product.base_price),
        schemeTag: product.scheme_tag ?? null,
        imageUrl: null,
      })),
      nextPage: page * pageSize < result.totalCount ? page + 1 : null,
    };
  }

  async searchProducts(tenantId: string, query: string) {
    const products = await this.catalogRepository.searchProducts(tenantId, query, 30);
    return products.map((product) => ({
      id: String(product.id),
      brandId: String(product.brand_id),
      brandName: product.brand_name ?? "Unknown",
      name: product.name,
      packSize: product.pack_size,
      basePrice: Number(product.base_price),
      advancePrice: Number(product.advance_price ?? product.base_price),
      schemeTag: null,
      imageUrl: null,
    }));
  }

  async getProduct(tenantId: string, productId: string) {
    const product = await this.catalogRepository.getProductById(tenantId, productId);
    if (!product) {
      return null;
    }

    const stockMap = await this.catalogRepository.getLatestStockMap(tenantId, [productId]);
    return {
      id: String(product.id),
      brandId: String(product.brand_id),
      brandName: product.brand_name ?? "Unknown",
      name: product.name,
      packSize: product.pack_size,
      basePrice: Number(product.base_price),
      advancePrice: Number(product.advance_price ?? product.base_price),
      schemeTag: null,
      imageUrl: null,
      currentStock: stockMap[productId] ?? 0,
    };
  }

  async getStockBatch(tenantId: string, productIds: string[]) {
    return this.catalogRepository.getLatestStockMap(tenantId, productIds);
  }

  async createBrand(name: string, tenantId?: string) {
    const existing = await this.catalogRepository.findBrandByName(name, tenantId);
    if (existing) {
      return {
        id: String(existing.id),
        name: existing.name,
        totalProductCount: 0,
        skuCount: 0,
        updatedAt: existing.updated_at ? new Date(existing.updated_at).toISOString() : new Date().toISOString(),
      };
    }

    const created = await this.catalogRepository.createBrand(name);
    return {
      id: String(created?.id),
      name: created?.name ?? name,
      totalProductCount: 0,
      skuCount: 0,
      updatedAt: created?.updated_at ? new Date(created.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  async createProducts(
    tenantId: string,
    products: Array<{
      brandId?: string;
      productName: string;
      variantPackSize: string;
      baseSellingPrice: number;
      mrp: number;
      openingStock: number;
      isActive: boolean;
    }>,
  ) {
    const defaultBrand =
      products.some((product) => !product.brandId) ? await this.getOrCreateDefaultBrandForTenant(tenantId) : null;

    const normalizedProducts = products.map((product) => ({
      ...product,
      brandId: product.brandId ?? String(defaultBrand?.id),
    }));

    const created = await this.catalogRepository.createTenantProducts(tenantId, normalizedProducts);
    return created.map((product) => ({
      id: String(product.id),
      brandId: String(product.brand_id),
      productName: product.name,
      variantPackSize: product.pack_size,
      baseSellingPrice: Number(product.base_price),
      mrp: Number(product.base_price),
      openingStock:
        normalizedProducts.find(
          (row) => row.productName === product.name && row.variantPackSize === product.pack_size,
        )?.openingStock ?? 0,
      isActive: true,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    }));
  }

  private async getOrCreateDefaultBrandForTenant(tenantId: string) {
    const existing = await this.catalogRepository.findDefaultBrandForTenant(tenantId);
    if (existing) {
      return existing;
    }

    return this.catalogRepository.createDefaultBrandForTenant(tenantId, DEFAULT_BRAND_NAME);
  }
}
