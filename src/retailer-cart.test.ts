import { describe, expect, test } from "vitest";

import {
  addCartItem,
  calculateCartItemCount,
  calculateCartTotal,
  mapProductToCartItem,
  removeCartItem,
  updateCartItemQuantity,
} from "../apps/retailer-app/lib/cart";
import type { Product } from "../apps/retailer-app/types/catalogue";

const sampleProduct: Product = {
  id: "product-1",
  brandId: "brand-1",
  brandName: "General",
  name: "Sample Product",
  packSize: "10 units",
  basePrice: 125,
  advancePrice: 125,
  schemeTag: null,
  imageUrl: null,
};

describe("retailer cart helpers", () => {
  test("maps a product to the simple cart item shape", () => {
    expect(mapProductToCartItem(sampleProduct)).toEqual({
      product_id: "product-1",
      name: "Sample Product",
      price: 125,
      quantity: 1,
    });
  });

  test("adds a new product and increments quantity for an existing one", () => {
    const firstPass = addCartItem([], sampleProduct);
    const secondPass = addCartItem(firstPass, sampleProduct);

    expect(secondPass).toEqual([
      {
        product_id: "product-1",
        name: "Sample Product",
        price: 125,
        quantity: 2,
      },
    ]);
  });

  test("updates quantity and removes items when quantity reaches zero", () => {
    const items = [
      {
        product_id: "product-1",
        name: "Sample Product",
        price: 125,
        quantity: 2,
      },
    ];

    expect(updateCartItemQuantity(items, "product-1", 5)).toEqual([
      {
        product_id: "product-1",
        name: "Sample Product",
        price: 125,
        quantity: 5,
      },
    ]);

    expect(updateCartItemQuantity(items, "product-1", 0)).toEqual([]);
  });

  test("removes items and calculates totals from the cart state", () => {
    const items = [
      {
        product_id: "product-1",
        name: "Sample Product",
        price: 125,
        quantity: 2,
      },
      {
        product_id: "product-2",
        name: "Another Product",
        price: 40,
        quantity: 3,
      },
    ];

    expect(removeCartItem(items, "product-1")).toEqual([
      {
        product_id: "product-2",
        name: "Another Product",
        price: 40,
        quantity: 3,
      },
    ]);
    expect(calculateCartItemCount(items)).toBe(5);
    expect(calculateCartTotal(items)).toBe(370);
  });
});
