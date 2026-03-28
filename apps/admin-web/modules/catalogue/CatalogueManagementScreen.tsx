"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { clearAuthSession, getApiErrorMessage } from "@/services/auth.service";
import { ApiError } from "@/services/api.service";
import { catalogueService } from "@/services/catalogue.service";
import type { Brand, CreateProductPayload, Product } from "@/types/catalogue";

type QuickAddRow = {
  id: string;
  productName: string;
  variantPackSize: string;
  baseSellingPrice: number;
  mrp: number;
  openingStock: number;
  isActive: boolean;
};

const createQuickRow = (): QuickAddRow => ({
  id: `QR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  productName: "",
  variantPackSize: "",
  baseSellingPrice: 0,
  mrp: 0,
  openingStock: 0,
  isActive: true,
});

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export function CatalogueManagementScreen() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [quickAddRows, setQuickAddRows] = useState<QuickAddRow[]>([createQuickRow()]);
  const [newBrandName, setNewBrandName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === selectedBrandId) ?? null,
    [brands, selectedBrandId],
  );

  const handleApiFailure = (apiError: unknown, fallbackMessage: string) => {
    if (apiError instanceof ApiError && apiError.status === 401) {
      clearAuthSession();
      setError("Your session expired. Please log in again.");
      router.push("/login");
      return true;
    }

    setError(getApiErrorMessage(apiError, fallbackMessage));
    return false;
  };

  const loadBrands = async () => {
    setLoadingBrands(true);
    setError(null);

    try {
      const list = await catalogueService.fetchBrands();
      setBrands(list);
      setSelectedBrandId((current) => {
        if (current && list.some((brand) => brand.id === current)) {
          return current;
        }

        return list[0]?.id ?? "";
      });
    } catch (brandsError) {
      handleApiFailure(brandsError, "Unable to load brands.");
    } finally {
      setLoadingBrands(false);
    }
  };

  const loadProducts = async (brandId: string) => {
    if (!brandId) {
      setProducts([]);
      return;
    }

    setLoadingProducts(true);
    setError(null);

    try {
      const list = await catalogueService.fetchProductsByBrand(brandId);
      setProducts(list);
    } catch (productsError) {
      handleApiFailure(productsError, "Unable to load products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    void loadBrands();
  }, []);

  useEffect(() => {
    if (!selectedBrandId) {
      setProducts([]);
      return;
    }

    void loadProducts(selectedBrandId);
  }, [selectedBrandId]);

  const updateQuickRow = (rowId: string, updater: (row: QuickAddRow) => QuickAddRow) => {
    setQuickAddRows((previous) => previous.map((row) => (row.id === rowId ? updater(row) : row)));
  };

  const addBrand = async () => {
    const name = newBrandName.trim();
    if (!name) {
      setError("Brand name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const created = await catalogueService.createBrand({ name });
      setBrands((previous) => [created, ...previous]);
      setSelectedBrandId(created.id);
      setNewBrandName("");
      setMessage("Brand created successfully.");
      router.push("/catalogue");
      router.refresh();
    } catch (brandError) {
      handleApiFailure(brandError, "Unable to create brand.");
    } finally {
      setSaving(false);
    }
  };

  const handleBrandSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) {
      return;
    }

    await addBrand();
  };

  const saveQuickProducts = async () => {
    const validRows = quickAddRows.filter((row) => row.productName.trim() && row.variantPackSize.trim());
    if (validRows.length === 0) {
      setError("Add at least one valid product row.");
      return;
    }

    const payload: CreateProductPayload[] = validRows.map((row) => ({
      brandId: selectedBrandId || undefined,
      productName: row.productName.trim(),
      variantPackSize: row.variantPackSize.trim(),
      baseSellingPrice: row.baseSellingPrice,
      mrp: row.mrp,
      openingStock: row.openingStock,
      isActive: row.isActive,
    }));

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const created = await catalogueService.createProducts(payload);
      const nextBrandId = created[0]?.brandId ?? selectedBrandId;

      setQuickAddRows([createQuickRow()]);
      setMessage(
        nextBrandId && !selectedBrandId
          ? `${created.length} products created under the General brand.`
          : `${created.length} products created.`,
      );

      await loadBrands();

      if (nextBrandId) {
        setSelectedBrandId(nextBrandId);
        await loadProducts(nextBrandId);
      }
    } catch (productError) {
      handleApiFailure(productError, "Failed to create products.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Lightweight Catalogue Management</h1>
        <p className="text-sm text-slate-600">Create products directly. Brand selection is optional.</p>
      </div>

      {message ? <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        <section className="col-span-3 flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-3 py-2">
            <h2 className="text-sm font-semibold text-slate-900">Brands</h2>
          </header>
          <form className="flex gap-2 border-b border-slate-200 p-3" onSubmit={(event) => void handleBrandSubmit(event)}>
            <input
              value={newBrandName}
              onChange={(event) => setNewBrandName(event.target.value)}
              placeholder="New brand name"
              className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {saving ? "Adding..." : "Add Brand"}
            </button>
          </form>
          <div className="border-b border-slate-200 px-3 py-2 text-xs text-slate-500">
            Products can be created without selecting a brand. The tenant default brand will be used automatically.
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {loadingBrands ? (
              <div className="p-3 text-sm text-slate-500">Loading brands...</div>
            ) : brands.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">No brands yet.</div>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-2">Brand</th>
                    <th className="border-b border-slate-200 px-2 py-2">Products</th>
                    <th className="border-b border-slate-200 px-2 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((brand) => (
                    <tr
                      key={brand.id}
                      onClick={() => setSelectedBrandId(brand.id)}
                      className={[
                        "cursor-pointer border-b border-slate-100 hover:bg-slate-50",
                        selectedBrandId === brand.id ? "bg-slate-100/80" : "",
                      ].join(" ")}
                    >
                      <td className="px-2 py-2 font-medium text-slate-800">{brand.name}</td>
                      <td className="px-2 py-2 text-slate-700">{brand.totalProductCount}</td>
                      <td className="px-2 py-2 text-slate-600">{formatDateTime(brand.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="col-span-9 flex min-h-0 flex-col gap-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Product Quick Add Table</h2>
                <p className="text-xs text-slate-500">
                  {selectedBrand
                    ? `New products will be added under ${selectedBrand.name}.`
                    : "No brand selected. New products will be added under the tenant default brand."}
                </p>
              </div>
            </header>
            <div className="overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-2">Product Name</th>
                    <th className="border-b border-slate-200 px-2 py-2">Variant / Pack Size</th>
                    <th className="border-b border-slate-200 px-2 py-2">Base Selling Price</th>
                    <th className="border-b border-slate-200 px-2 py-2">MRP</th>
                    <th className="border-b border-slate-200 px-2 py-2">Opening Stock</th>
                    <th className="border-b border-slate-200 px-2 py-2">Active</th>
                    <th className="border-b border-slate-200 px-2 py-2">Row</th>
                  </tr>
                </thead>
                <tbody>
                  {quickAddRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">
                        <input
                          value={row.productName}
                          onChange={(event) =>
                            updateQuickRow(row.id, (current) => ({
                              ...current,
                              productName: event.target.value,
                            }))
                          }
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={row.variantPackSize}
                          onChange={(event) =>
                            updateQuickRow(row.id, (current) => ({
                              ...current,
                              variantPackSize: event.target.value,
                            }))
                          }
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={row.baseSellingPrice}
                          onChange={(event) =>
                            updateQuickRow(row.id, (current) => ({
                              ...current,
                              baseSellingPrice: Math.max(0, Number(event.target.value)),
                            }))
                          }
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={row.mrp}
                          onChange={(event) =>
                            updateQuickRow(row.id, (current) => ({
                              ...current,
                              mrp: Math.max(0, Number(event.target.value)),
                            }))
                          }
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={row.openingStock}
                          onChange={(event) =>
                            updateQuickRow(row.id, (current) => ({
                              ...current,
                              openingStock: Math.max(0, Number(event.target.value)),
                            }))
                          }
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={row.isActive}
                          onChange={(event) =>
                            updateQuickRow(row.id, (current) => ({
                              ...current,
                              isActive: event.target.checked,
                            }))
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => setQuickAddRows((previous) => previous.filter((item) => item.id !== row.id))}
                          className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 border-t border-slate-200 p-3">
              <button
                type="button"
                onClick={() => setQuickAddRows((previous) => [...previous, createQuickRow()])}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs"
              >
                Add Row
              </button>
              <button
                type="button"
                onClick={() => void saveQuickProducts()}
                disabled={saving}
                className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
              >
                Save Products
              </button>
            </div>
          </div>

          <section className="min-h-0 rounded-lg border border-slate-200 bg-white">
            <header className="border-b border-slate-200 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-900">Products</h3>
            </header>

            {!selectedBrandId ? (
              <div className="flex min-h-[260px] items-center justify-center p-8">
                <EmptyState
                  icon="!"
                  title="No brand selected"
                  helper="Select a brand to view its products. If you save products without selecting one, the tenant default brand will be used."
                />
              </div>
            ) : loadingProducts ? (
              <div className="p-3 text-sm text-slate-500">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="flex min-h-[260px] items-center justify-center p-8">
                <EmptyState
                  icon="!"
                  title="No products available"
                  helper="This brand has no products in the backend yet."
                />
              </div>
            ) : (
              <div className="max-h-[340px] overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="border-b border-slate-200 px-2 py-2">Product</th>
                      <th className="border-b border-slate-200 px-2 py-2">Pack</th>
                      <th className="border-b border-slate-200 px-2 py-2">Base Price</th>
                      <th className="border-b border-slate-200 px-2 py-2">MRP</th>
                      <th className="border-b border-slate-200 px-2 py-2">Opening Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 text-slate-800">{product.productName}</td>
                        <td className="px-2 py-2 text-slate-600">{product.variantPackSize}</td>
                        <td className="px-2 py-2 text-slate-600">{product.baseSellingPrice}</td>
                        <td className="px-2 py-2 text-slate-600">{product.mrp}</td>
                        <td className="px-2 py-2 text-slate-600">{product.openingStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
