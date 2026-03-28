import { getStoredSession } from "@/services/auth.service";
import { apiService } from "@/services/api.service";
import { env } from "@/services/env";
import type {
  Brand,
  CreateBrandPayload,
  CreateProductPayload,
  ParsedProductSuggestion,
  Product,
} from "@/types/catalogue";

type CatalogBrandResponse = {
  id: string;
  name: string;
  totalProductCount?: number;
  updatedAt?: string;
};

type CatalogProductListResponse = {
  items: Array<{
    id: string;
    brandId: string;
    name: string;
    packSize: string;
    basePrice: number;
    imageUrl: string | null;
  }>;
  nextPage: number | null;
};

type CreatedProductResponse = {
  id: string;
  brandId: string;
  productName: string;
  variantPackSize: string;
  baseSellingPrice: number;
  mrp: number;
  openingStock: number;
  isActive: boolean;
  imageUrl: string | null;
  createdAt: string;
};

const getRequiredTenantId = (): string => {
  const tenantId = getStoredSession()?.tenant.id;
  if (!tenantId) {
    throw new Error("Your admin session has expired. Please log in again.");
  }

  return tenantId;
};

const mapBrand = (brand: CatalogBrandResponse): Brand => ({
  id: brand.id,
  name: brand.name,
  totalProductCount: brand.totalProductCount ?? 0,
  updatedAt: brand.updatedAt ?? new Date().toISOString(),
});

const mapProduct = (product: CreatedProductResponse | CatalogProductListResponse["items"][number]): Product => ({
  id: product.id,
  brandId: product.brandId,
  productName: "productName" in product ? product.productName : product.name,
  variantPackSize: "variantPackSize" in product ? product.variantPackSize : product.packSize,
  baseSellingPrice: "baseSellingPrice" in product ? product.baseSellingPrice : product.basePrice,
  mrp: "mrp" in product ? product.mrp : product.basePrice,
  openingStock: "openingStock" in product ? product.openingStock : 0,
  isActive: "isActive" in product ? product.isActive : true,
  imageUrl: product.imageUrl,
  createdAt: "createdAt" in product ? product.createdAt : new Date().toISOString(),
});

class CatalogueService {
  async fetchBrands(): Promise<Brand[]> {
    const tenantId = getRequiredTenantId();
    const brands = await apiService.request<CatalogBrandResponse[]>(
      `/catalogue/brands?tenant_id=${encodeURIComponent(tenantId)}`,
      { method: "GET" },
    );

    return brands.map(mapBrand);
  }

  async createBrand(payload: CreateBrandPayload): Promise<Brand> {
    const brand = await apiService.request<CatalogBrandResponse>("/catalogue/brands", {
      method: "POST",
      body: payload,
    });

    return mapBrand(brand);
  }

  async fetchProductsByBrand(brandId: string): Promise<Product[]> {
    const tenantId = getRequiredTenantId();
    const response = await apiService.request<CatalogProductListResponse>(
      `/catalogue/brands/${encodeURIComponent(brandId)}/products?tenant_id=${encodeURIComponent(tenantId)}`,
      { method: "GET" },
    );

    return response.items.map(mapProduct);
  }

  async createProducts(payload: CreateProductPayload[]): Promise<Product[]> {
    if (payload.length === 0) {
      return [];
    }

    const tenantId = getRequiredTenantId();
    const products = await apiService.request<CreatedProductResponse[]>("/catalogue/products", {
      method: "POST",
      body: {
        tenant_id: tenantId,
        products: payload,
      },
    });

    return products.map(mapProduct);
  }

  async bulkCreateProducts(brandId: string, rows: ParsedProductSuggestion[]): Promise<Product[]> {
    const acceptedRows = rows.filter((row) => row.status === "ACCEPTED");
    const payload = acceptedRows.map((row) => ({
      brandId,
      productName: row.productName,
      variantPackSize: row.variantPackSize,
      baseSellingPrice: row.baseSellingPrice,
      mrp: row.mrp,
      openingStock: row.openingStock,
      isActive: row.isActive,
    }));
    return this.createProducts(payload);
  }

  async uploadProductImages(brandId: string, files: File[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    const authToken = getStoredSession()?.accessToken;
    const formData = new FormData();
    formData.append("brandId", brandId);
    files.forEach((file) => formData.append("files", file));

    const response = await fetch(`${env.apiBaseUrl}/catalogue/product-images`, {
      method: "POST",
      body: formData,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });

    if (!response.ok) {
      throw new Error("Image upload failed.");
    }
  }

  simulateParseCataloguePdf(fileName: string): ParsedProductSuggestion[] {
    return [
      {
        id: `SG-${Date.now()}-1`,
        productName: `${fileName.split(".")[0]} Refined Oil`,
        variantPackSize: "1L",
        baseSellingPrice: 130,
        mrp: 145,
        openingStock: 100,
        isActive: true,
        status: "PENDING",
      },
      {
        id: `SG-${Date.now()}-2`,
        productName: `${fileName.split(".")[0]} Chana Dal`,
        variantPackSize: "1kg",
        baseSellingPrice: 86,
        mrp: 98,
        openingStock: 70,
        isActive: true,
        status: "PENDING",
      },
      {
        id: `SG-${Date.now()}-3`,
        productName: `${fileName.split(".")[0]} Tea Dust`,
        variantPackSize: "500g",
        baseSellingPrice: 210,
        mrp: 235,
        openingStock: 35,
        isActive: true,
        status: "PENDING",
      },
    ];
  }
}

export const catalogueService = new CatalogueService();
