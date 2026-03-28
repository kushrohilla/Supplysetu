"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { clearAuthSession, getApiErrorMessage } from "@/services/auth.service";
import { ApiError } from "@/services/api.service";
import { catalogueService } from "@/services/catalogue.service";
import { orderService } from "@/services/order.service";
import { retailerService } from "@/services/retailer.service";
import type { Brand, Product } from "@/types/catalogue";
import type { Retailer } from "@/types/retailer";

type OrderItemRow = {
  id: string;
  product_id: string;
  quantity: number;
};

const createItemRow = (): OrderItemRow => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  product_id: "",
  quantity: 1,
});

export function OrderCreateScreen() {
  const router = useRouter();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [retailerId, setRetailerId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [rows, setRows] = useState<OrderItemRow[]>([createItemRow()]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRetailer = useMemo(
    () => retailers.find((retailer) => retailer.id === retailerId) ?? null,
    [retailers, retailerId],
  );

  useEffect(() => {
    const loadDependencies = async () => {
      setLoading(true);
      setError(null);

      try {
        const [retailerList, brandList] = await Promise.all([
          retailerService.fetchRetailers(),
          catalogueService.fetchBrands(),
        ]);

        setRetailers(retailerList);
        setBrands(brandList);
        setRetailerId(retailerList[0]?.id ?? "");
        setBrandId(brandList[0]?.id ?? "");
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearAuthSession();
          router.push("/login");
          return;
        }

        setError(getApiErrorMessage(loadError, "Unable to load order dependencies."));
      } finally {
        setLoading(false);
      }
    };

    void loadDependencies();
  }, [router]);

  useEffect(() => {
    if (!brandId) {
      setProducts([]);
      return;
    }

    const loadProducts = async () => {
      setLoadingProducts(true);
      setError(null);

      try {
        const data = await catalogueService.fetchProductsByBrand(brandId);
        setProducts(data);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearAuthSession();
          router.push("/login");
          return;
        }

        setError(getApiErrorMessage(loadError, "Unable to load products for this brand."));
      } finally {
        setLoadingProducts(false);
      }
    };

    void loadProducts();
  }, [brandId, router]);

  const updateRow = (rowId: string, updater: (row: OrderItemRow) => OrderItemRow) => {
    setRows((current) => current.map((row) => (row.id === rowId ? updater(row) : row)));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    if (!retailerId) {
      setError("Select a retailer before creating an order.");
      return;
    }

    const validItems = rows.filter((row) => row.product_id && row.quantity > 0);
    if (validItems.length === 0) {
      setError("Add at least one product with a valid quantity.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const order = await orderService.createOrder({
        retailer_id: retailerId,
        items: validItems.map((row) => ({
          product_id: row.product_id,
          quantity: row.quantity,
        })),
      });

      router.push(`/review-orders/${order.id}`);
      router.refresh();
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 401) {
        clearAuthSession();
        router.push("/login");
        return;
      }

      setError(getApiErrorMessage(submitError, "Unable to create order."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading order form...</div>;
  }

  if (retailers.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
        <EmptyState
          icon="!"
          title="No retailers available"
          helper="Create at least one retailer in the backend before placing an order."
        />
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
        <EmptyState
          icon="!"
          title="No products available"
          helper="Catalogue products must exist in the backend before an order can be created."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Create Order</h1>
          <p className="text-sm text-slate-600">
            Place a real order for {selectedRetailer?.name ?? "your retailer"} using backend catalogue data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/review-orders")}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Back to Orders
        </button>
      </div>

      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Retailer</label>
            <select
              value={retailerId}
              onChange={(event) => setRetailerId(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {retailers.map((retailer) => (
                <option key={retailer.id} value={retailer.id}>
                  {retailer.name} ({retailer.mobile_number})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Brand Filter</label>
            <select
              value={brandId}
              onChange={(event) => setBrandId(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Order Items</h2>
            <p className="text-xs text-slate-500">Only backend products for the selected brand are available.</p>
          </div>

          {loadingProducts ? (
            <div className="p-4 text-sm text-slate-500">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No products available for this brand.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3">Product</th>
                    <th className="border-b border-slate-200 px-4 py-3">Pack</th>
                    <th className="border-b border-slate-200 px-4 py-3">Price</th>
                    <th className="border-b border-slate-200 px-4 py-3">Quantity</th>
                    <th className="border-b border-slate-200 px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const selectedProduct = products.find((product) => product.id === row.product_id);

                    return (
                      <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3">
                          <select
                            value={row.product_id}
                            onChange={(event) =>
                              updateRow(row.id, (current) => ({
                                ...current,
                                product_id: event.target.value,
                              }))
                            }
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                          >
                            <option value="">Select product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.productName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{selectedProduct?.variantPackSize ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {selectedProduct ? new Intl.NumberFormat("en-IN").format(selectedProduct.baseSellingPrice) : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(event) =>
                              updateRow(row.id, (current) => ({
                                ...current,
                                quantity: Math.max(1, Number(event.target.value)),
                              }))
                            }
                            className="w-24 rounded border border-slate-300 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                            disabled={rows.length === 1}
                            className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={() => setRows((current) => [...current, createItemRow()])}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Add Row
            </button>
            <button
              type="submit"
              disabled={saving || products.length === 0}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Order"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
