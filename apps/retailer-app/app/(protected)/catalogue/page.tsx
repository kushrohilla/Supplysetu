"use client";

import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { getApiErrorMessage } from "@/services/auth.service";
import { catalogueService } from "@/services/catalogue.service";
import type { Brand, Product } from "@/types/catalogue";

export default function CataloguePage() {
  const { addItem } = useCart();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        setLoading(true);
        setError(null);
        const nextBrands = await catalogueService.getBrands();
        setBrands(nextBrands);
        setActiveBrandId(nextBrands[0]?.id ?? null);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, "Unable to load catalogue."));
      } finally {
        setLoading(false);
      }
    };

    void loadBrands();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      if (!activeBrandId && search.trim().length < 2) {
        setProducts([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (search.trim().length >= 2) {
          const results = await catalogueService.searchProducts(search.trim());
          setProducts(results);
        } else if (activeBrandId) {
          const result = await catalogueService.getProductsByBrand(activeBrandId);
          setProducts(result.items);
        }
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, "Unable to load products."));
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, [activeBrandId, search]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Catalogue</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Browse and add products quickly</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products"
          className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-900"
        />
      </div>

      {search.trim().length < 2 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {brands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => setActiveBrandId(brand.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                activeBrandId === brand.id ? "bg-slate-900 text-white" : "bg-white text-slate-700"
              }`}
            >
              {brand.name}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-600">Loading products...</p> : null}
      {!loading && !error && products.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          No products available yet.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <div key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{product.brandName}</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{product.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{product.packSize}</p>
            <p className="mt-4 text-base font-semibold text-slate-900">Rs. {product.basePrice.toFixed(2)}</p>
            <button
              type="button"
              onClick={() => addItem(product)}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Add to cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
