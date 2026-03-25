export type Brand = {
  id: string;
  name: string;
  totalProductCount: number;
  updatedAt: string;
};

export type Product = {
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

export type CreateBrandPayload = {
  name: string;
};

export type CreateProductPayload = {
  brandId: string;
  productName: string;
  variantPackSize: string;
  baseSellingPrice: number;
  mrp: number;
  openingStock: number;
  isActive: boolean;
};

export type ParsedProductSuggestion = {
  id: string;
  productName: string;
  variantPackSize: string;
  baseSellingPrice: number;
  mrp: number;
  openingStock: number;
  isActive: boolean;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
};
