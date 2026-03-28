import { apiService } from "@/services/api.service";
import type { Brand, Product } from "@/types/catalogue";

type ProductListResponse = {
  items: Product[];
  nextPage: number | null;
};

export const catalogueService = {
  getBrands() {
    return apiService.request<Brand[]>("/catalogue/brands");
  },

  getProductsByBrand(brandId: string) {
    return apiService.request<ProductListResponse>(`/catalogue/brands/${encodeURIComponent(brandId)}/products`);
  },

  searchProducts(query: string) {
    return apiService.request<Product[]>(`/catalogue/search?q=${encodeURIComponent(query)}`);
  },
};
