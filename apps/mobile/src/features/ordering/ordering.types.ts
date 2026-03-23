export type PaymentMode = "advance" | "cod";

export type ProductSummary = {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  packSize: string;
  basePrice: number;
  advancePrice: number;
  schemeTag: string | null;
};

export type BrandSummary = {
  id: string;
  name: string;
  skuCount: number;
};

export type CartItem = {
  product: ProductSummary;
  quantity: number;
};

export type CartSummary = {
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
  minimumOrderValue: number;
  remainingToMinimum: number;
  meetsMinimumOrderValue: boolean;
};
