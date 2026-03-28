export type Brand = {
  id: string;
  name: string;
  totalProductCount: number;
  skuCount: number;
  updatedAt: string;
};

export type Product = {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  packSize: string;
  basePrice: number;
  advancePrice: number;
  schemeTag: string | null;
  imageUrl: string | null;
};
