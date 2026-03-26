import type { CatalogRepository } from "./module.repository";

export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async getBrands(tenantId: string) {
    const brands = await this.catalogRepository.listBrands(tenantId);
    return brands.map((brand) => ({
      id: String(brand.id),
      name: brand.name,
      skuCount: Number(brand.sku_count ?? 0),
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
}
