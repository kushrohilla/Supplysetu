import { apiService } from "@/services/api.service";
import type {
  Brand,
  CreateBrandPayload,
  CreateProductPayload,
  ParsedProductSuggestion,
  Product
} from "@/types/catalogue";

const USE_MOCK_CATALOGUE = process.env.NEXT_PUBLIC_USE_MOCK_CATALOGUE !== "false";

let mockBrands: Brand[] = [
  {
    id: "BR-101",
    name: "Aarav Foods",
    totalProductCount: 3,
    updatedAt: new Date().toISOString()
  },
  {
    id: "BR-102",
    name: "Shakti Essentials",
    totalProductCount: 2,
    updatedAt: new Date(Date.now() - 1000 * 60 * 50).toISOString()
  }
];

let mockProducts: Product[] = [
  {
    id: "PR-1001",
    brandId: "BR-101",
    productName: "Sunflower Oil",
    variantPackSize: "1L",
    baseSellingPrice: 132,
    mrp: 145,
    openingStock: 120,
    isActive: true,
    imageUrl: null,
    createdAt: new Date().toISOString()
  },
  {
    id: "PR-1002",
    brandId: "BR-101",
    productName: "Toor Dal",
    variantPackSize: "1kg",
    baseSellingPrice: 142,
    mrp: 155,
    openingStock: 80,
    isActive: true,
    imageUrl: null,
    createdAt: new Date().toISOString()
  },
  {
    id: "PR-1003",
    brandId: "BR-101",
    productName: "Rice",
    variantPackSize: "5kg",
    baseSellingPrice: 320,
    mrp: 345,
    openingStock: 64,
    isActive: true,
    imageUrl: null,
    createdAt: new Date().toISOString()
  },
  {
    id: "PR-1004",
    brandId: "BR-102",
    productName: "Tea",
    variantPackSize: "250g",
    baseSellingPrice: 108,
    mrp: 120,
    openingStock: 40,
    isActive: true,
    imageUrl: null,
    createdAt: new Date().toISOString()
  },
  {
    id: "PR-1005",
    brandId: "BR-102",
    productName: "Sugar",
    variantPackSize: "1kg",
    baseSellingPrice: 44,
    mrp: 50,
    openingStock: 180,
    isActive: true,
    imageUrl: null,
    createdAt: new Date().toISOString()
  }
];

const cloneBrands = (): Brand[] => mockBrands.map((brand) => ({ ...brand }));
const cloneProducts = (brandId: string): Product[] =>
  mockProducts.filter((product) => product.brandId === brandId).map((product) => ({ ...product }));

const refreshBrandStats = (brandId: string): void => {
  const count = mockProducts.filter((product) => product.brandId === brandId).length;
  mockBrands = mockBrands.map((brand) =>
    brand.id === brandId ? { ...brand, totalProductCount: count, updatedAt: new Date().toISOString() } : brand
  );
};

class CatalogueService {
  async fetchBrands(): Promise<Brand[]> {
    if (USE_MOCK_CATALOGUE) {
      return cloneBrands();
    }

    try {
      return await apiService.request<Brand[]>("/catalogue/brands", { method: "GET" });
    } catch {
      return cloneBrands();
    }
  }

  async createBrand(payload: CreateBrandPayload): Promise<Brand> {
    if (USE_MOCK_CATALOGUE) {
      const brand: Brand = {
        id: `BR-${Math.floor(Date.now() / 1000)}`,
        name: payload.name,
        totalProductCount: 0,
        updatedAt: new Date().toISOString()
      };
      mockBrands = [brand, ...mockBrands];
      return { ...brand };
    }

    return apiService.request<Brand>("/catalogue/brands", {
      method: "POST",
      body: payload
    });
  }

  async fetchProductsByBrand(brandId: string): Promise<Product[]> {
    if (USE_MOCK_CATALOGUE) {
      return cloneProducts(brandId);
    }

    try {
      return await apiService.request<Product[]>(`/catalogue/brands/${brandId}/products`, { method: "GET" });
    } catch {
      return cloneProducts(brandId);
    }
  }

  async createProducts(payload: CreateProductPayload[]): Promise<Product[]> {
    if (payload.length === 0) {
      return [];
    }

    if (USE_MOCK_CATALOGUE) {
      const created = payload.map((row, index) => ({
        id: `PR-${Date.now()}-${index}`,
        brandId: row.brandId,
        productName: row.productName,
        variantPackSize: row.variantPackSize,
        baseSellingPrice: row.baseSellingPrice,
        mrp: row.mrp,
        openingStock: row.openingStock,
        isActive: row.isActive,
        imageUrl: null,
        createdAt: new Date().toISOString()
      }));
      mockProducts = [...created, ...mockProducts];
      refreshBrandStats(payload[0].brandId);
      return created.map((item) => ({ ...item }));
    }

    return apiService.request<Product[]>("/catalogue/products", {
      method: "POST",
      body: { products: payload }
    });
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
      isActive: row.isActive
    }));
    return this.createProducts(payload);
  }

  async uploadProductImages(brandId: string, files: File[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    if (USE_MOCK_CATALOGUE) {
      mockBrands = mockBrands.map((brand) =>
        brand.id === brandId ? { ...brand, updatedAt: new Date().toISOString() } : brand
      );
      return;
    }

    const formData = new FormData();
    formData.append("brandId", brandId);
    files.forEach((file) => formData.append("files", file));

    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/catalogue/product-images`, {
      method: "POST",
      body: formData
    });
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
        status: "PENDING"
      },
      {
        id: `SG-${Date.now()}-2`,
        productName: `${fileName.split(".")[0]} Chana Dal`,
        variantPackSize: "1kg",
        baseSellingPrice: 86,
        mrp: 98,
        openingStock: 70,
        isActive: true,
        status: "PENDING"
      },
      {
        id: `SG-${Date.now()}-3`,
        productName: `${fileName.split(".")[0]} Tea Dust`,
        variantPackSize: "500g",
        baseSellingPrice: 210,
        mrp: 235,
        openingStock: 35,
        isActive: true,
        status: "PENDING"
      }
    ];
  }
}

export const catalogueService = new CatalogueService();
