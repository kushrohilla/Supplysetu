import type { Product } from "@/types/catalogue";

export type CartItem = {
  productId: string;
  productName: string;
  brandName: string;
  packSize: string;
  price: number;
  quantity: number;
};

export const mapProductToCartItem = (product: Product): CartItem => ({
  productId: product.id,
  productName: product.name,
  brandName: product.brandName,
  packSize: product.packSize,
  price: product.basePrice,
  quantity: 1,
});
