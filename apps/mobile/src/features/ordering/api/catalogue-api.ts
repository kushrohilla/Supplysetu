import { BrandSummary, PaymentMode, ProductSummary } from "../ordering.types";

const PAGE_SIZE = 12;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const brands: BrandSummary[] = [
  { id: "br-1", name: "Nestle", skuCount: 24 },
  { id: "br-2", name: "HUL", skuCount: 28 },
  { id: "br-3", name: "ITC", skuCount: 22 },
  { id: "br-4", name: "Britannia", skuCount: 20 },
  { id: "br-5", name: "Parle", skuCount: 18 },
  { id: "br-6", name: "Dabur", skuCount: 16 }
];

const buildProducts = (): ProductSummary[] => {
  return brands.flatMap((brand, brandIndex) =>
    Array.from({ length: brand.skuCount }).map((_, index) => {
      const basePrice = 90 + brandIndex * 20 + index * 3;
      return {
        id: `${brand.id}-prd-${index + 1}`,
        brandId: brand.id,
        brandName: brand.name,
        name: `${brand.name} Product ${index + 1}`,
        packSize: `${100 + (index % 6) * 50}g`,
        basePrice,
        advancePrice: Math.max(basePrice - 6, 50),
        schemeTag: index % 4 === 0 ? "Scheme" : index % 5 === 0 ? "COD+" : null
      };
    })
  );
};

const catalogueProducts = buildProducts();

export const catalogueApi = {
  async getBrands(): Promise<BrandSummary[]> {
    await delay(250);
    return brands;
  },

  async getProducts(params: {
    brandId?: string;
    search?: string;
    page: number;
  }): Promise<{
    items: ProductSummary[];
    nextPage: number | null;
  }> {
    await delay(350);

    const normalizedSearch = params.search?.trim().toLowerCase() ?? "";
    const filtered = catalogueProducts.filter((product) => {
      const brandMatch = params.brandId ? product.brandId === params.brandId : true;
      const searchMatch = normalizedSearch ? product.name.toLowerCase().includes(normalizedSearch) : true;
      return brandMatch && searchMatch;
    });

    const start = (params.page - 1) * PAGE_SIZE;
    const items = filtered.slice(start, start + PAGE_SIZE);
    const nextPage = start + PAGE_SIZE < filtered.length ? params.page + 1 : null;

    return {
      items,
      nextPage
    };
  },

  async submitOrder(params: {
    paymentMode: PaymentMode;
    subtotal: number;
    totalQuantity: number;
  }): Promise<{
    orderId: string;
    expectedDeliveryDate: string;
    paymentMode: PaymentMode;
    subtotal: number;
    totalQuantity: number;
  }> {
    await delay(500);

    return {
      orderId: `ord-${Date.now()}`,
      expectedDeliveryDate: params.paymentMode === "advance" ? "2026-03-15" : "2026-03-16",
      paymentMode: params.paymentMode,
      subtotal: params.subtotal,
      totalQuantity: params.totalQuantity
    };
  }
};
