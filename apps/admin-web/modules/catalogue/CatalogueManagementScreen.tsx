"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/services/auth.service";
import { catalogueService } from "@/services/catalogue.service";
import type { Brand, CreateProductPayload, ParsedProductSuggestion, Product } from "@/types/catalogue";
import { EmptyState } from "@/components/ui/empty-state";

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
  isActive: true
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
  const [suggestions, setSuggestions] = useState<ParsedProductSuggestion[]>([]);
  const [selectedPdfName, setSelectedPdfName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkDropActive, setBulkDropActive] = useState(false);

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === selectedBrandId) ?? null,
    [brands, selectedBrandId]
  );

  const acceptedSuggestions = useMemo(
    () => suggestions.filter((row) => row.status === "ACCEPTED"),
    [suggestions]
  );

  const loadBrands = async () => {
    setLoadingBrands(true);
    try {
      const list = await catalogueService.fetchBrands();
      setBrands(list);
      if (!selectedBrandId && list.length > 0) {
        setSelectedBrandId(list[0].id);
      }
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
    try {
      const list = await catalogueService.fetchProductsByBrand(brandId);
      setProducts(list);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    void loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBrandId) {
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
      router.replace("/catalogue");
    } catch (brandError) {
      setError(getApiErrorMessage(brandError, "Unable to create brand."));
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
    if (!selectedBrandId) {
      setError("Select a brand first.");
      return;
    }

    const validRows = quickAddRows.filter(
      (row) => row.productName.trim() && row.variantPackSize.trim()
    );
    if (validRows.length === 0) {
      setError("Add at least one valid product row.");
      return;
    }

    const payload: CreateProductPayload[] = validRows.map((row) => ({
      brandId: selectedBrandId,
      productName: row.productName.trim(),
      variantPackSize: row.variantPackSize.trim(),
      baseSellingPrice: row.baseSellingPrice,
      mrp: row.mrp,
      openingStock: row.openingStock,
      isActive: row.isActive
    }));

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const created = await catalogueService.createProducts(payload);
      setProducts((previous) => [...created, ...previous]);
      setQuickAddRows([createQuickRow()]);
      setMessage(`${created.length} products created.`);
      await loadBrands();
    } catch (productError) {
      setError(getApiErrorMessage(productError, "Failed to create products."));
    } finally {
      setSaving(false);
    }
  };

  const parseCataloguePdf = (file: File) => {
    const parsed = catalogueService.simulateParseCataloguePdf(file.name);
    setSelectedPdfName(file.name);
    setSuggestions(parsed);
    setMessage(`Parsed ${file.name}. Review and accept rows.`);
    setError(null);
  };

  const bulkCreateAccepted = async () => {
    if (!selectedBrandId) {
      setError("Select a brand first.");
      return;
    }
    if (acceptedSuggestions.length === 0) {
      setError("No accepted suggestion rows to create.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await catalogueService.bulkCreateProducts(selectedBrandId, suggestions);
      setProducts((previous) => [...created, ...previous]);
      setSuggestions([]);
      setSelectedPdfName("");
      setMessage(`${created.length} products created from parsed catalogue.`);
      await loadBrands();
    } catch (bulkError) {
      setError(getApiErrorMessage(bulkError, "Failed bulk product creation."));
    } finally {
      setSaving(false);
    }
  };

  const uploadSingleImage = async (file: File) => {
    if (!selectedBrandId) {
      setError("Select a brand first.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await catalogueService.uploadProductImages(selectedBrandId, [file]);
      setMessage(`Uploaded image: ${file.name}`);
    } catch (imageError) {
      setError(getApiErrorMessage(imageError, "Image upload failed."));
    } finally {
      setSaving(false);
    }
  };

  const uploadBulkImages = async (files: File[]) => {
    if (!selectedBrandId || files.length === 0) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await catalogueService.uploadProductImages(selectedBrandId, files);
      setMessage(`${files.length} image files processed.`);
    } catch (bulkImageError) {
      setError(getApiErrorMessage(bulkImageError, "Bulk image upload failed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Lightweight Catalogue Management</h1>
        <p className="text-sm text-slate-600">
          Digitise brands and products quickly for retailer ordering.
        </p>
      </div>

      {message ? <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        <section className="col-span-3 flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-3 py-2">
            <h2 className="text-sm font-semibold text-slate-900">Brand Management</h2>
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
              {saving ? "Adding..." : "Add New Brand"}
            </button>
          </form>
          <div className="min-h-0 flex-1 overflow-auto">
            {loadingBrands ? (
              <div className="p-3 text-sm text-slate-500">Loading brands...</div>
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
                        selectedBrandId === brand.id ? "bg-slate-100/80" : ""
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
          {!loadingBrands && brands.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon="📦"
                title="Your catalog is empty"
                helper="Add your first brand to start building your product catalog."
                ctaLabel="Add brand"
                onCtaPress={() => {
                  const input = document.querySelector('input[placeholder="New brand name"]') as HTMLInputElement;
                  if (input) input.focus();
                }}
                hint={
                  <>
                    <p className="mb-2 font-medium text-slate-800">Catalog structure:</p>
                    <div className="rounded-md bg-slate-100 p-3 pt-4 font-mono text-[11px] leading-relaxed text-slate-700">
                      <div>Brand  →  Product  →  SKU</div>
                      <div className="mt-2 grid grid-cols-[60px_1fr] gap-x-2">
                        <div className="font-semibold text-slate-900">Amul</div>
                        <div>
                          <div className="grid grid-cols-[80px_1fr] gap-x-2">
                            <div className="font-medium">Butter</div>
                            <div>
                              <div>500g pack</div>
                              <div>200g pack</div>
                            </div>
                          </div>
                          <div className="mt-1 grid grid-cols-[80px_1fr] gap-x-2">
                            <div className="font-medium">Cheese</div>
                            <div>1kg block</div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-slate-200 pt-2 text-slate-500">
                        Each SKU gets its own price, stock, and scheme mapping.
                      </div>
                    </div>
                  </>
                }
              />
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 bg-white">
                <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h2 className="text-sm font-semibold text-slate-900">Product Quick Add Table</h2>
                  <div className="text-xs text-slate-500">
                    Brand: <span className="font-medium text-slate-700">{selectedBrand?.name ?? "-"}</span>
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
                                  productName: event.target.value
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
                                  variantPackSize: event.target.value
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
                                  baseSellingPrice: Math.max(0, Number(event.target.value))
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
                                  mrp: Math.max(0, Number(event.target.value))
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
                                  openingStock: Math.max(0, Number(event.target.value))
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
                                  isActive: event.target.checked
                                }))
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() =>
                                setQuickAddRows((previous) => previous.filter((item) => item.id !== row.id))
                              }
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

              <div className="grid grid-cols-2 gap-4">
                <section className="rounded-lg border border-slate-200 bg-white">
                  <header className="border-b border-slate-200 px-3 py-2">
                    <h3 className="text-sm font-semibold text-slate-900">Catalogue Upload Assist</h3>
                  </header>
                  <div className="space-y-3 p-3">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }
                        parseCataloguePdf(file);
                      }}
                      className="w-full text-xs"
                    />
                    {selectedPdfName ? (
                      <div className="text-xs text-slate-600">Parsed File: {selectedPdfName}</div>
                    ) : null}
                    <div className="max-h-56 overflow-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                          <tr>
                            <th className="border-b border-slate-200 px-2 py-2">Name</th>
                            <th className="border-b border-slate-200 px-2 py-2">Pack</th>
                            <th className="border-b border-slate-200 px-2 py-2">Price</th>
                            <th className="border-b border-slate-200 px-2 py-2">MRP</th>
                            <th className="border-b border-slate-200 px-2 py-2">Stock</th>
                            <th className="border-b border-slate-200 px-2 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {suggestions.map((row) => (
                            <tr key={row.id} className="border-b border-slate-100">
                              <td className="px-2 py-2">
                                <input
                                  value={row.productName}
                                  onChange={(event) =>
                                    setSuggestions((previous) =>
                                      previous.map((item) =>
                                        item.id === row.id
                                          ? {
                                              ...item,
                                              productName: event.target.value
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className="w-full rounded border border-slate-300 px-1 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  value={row.variantPackSize}
                                  onChange={(event) =>
                                    setSuggestions((previous) =>
                                      previous.map((item) =>
                                        item.id === row.id
                                          ? {
                                              ...item,
                                              variantPackSize: event.target.value
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className="w-full rounded border border-slate-300 px-1 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  value={row.baseSellingPrice}
                                  onChange={(event) =>
                                    setSuggestions((previous) =>
                                      previous.map((item) =>
                                        item.id === row.id
                                          ? {
                                              ...item,
                                              baseSellingPrice: Math.max(0, Number(event.target.value))
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className="w-16 rounded border border-slate-300 px-1 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  value={row.mrp}
                                  onChange={(event) =>
                                    setSuggestions((previous) =>
                                      previous.map((item) =>
                                        item.id === row.id
                                          ? {
                                              ...item,
                                              mrp: Math.max(0, Number(event.target.value))
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className="w-16 rounded border border-slate-300 px-1 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  value={row.openingStock}
                                  onChange={(event) =>
                                    setSuggestions((previous) =>
                                      previous.map((item) =>
                                        item.id === row.id
                                          ? {
                                              ...item,
                                              openingStock: Math.max(0, Number(event.target.value))
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className="w-16 rounded border border-slate-300 px-1 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <select
                                  value={row.status}
                                  onChange={(event) =>
                                    setSuggestions((previous) =>
                                      previous.map((item) =>
                                        item.id === row.id
                                          ? {
                                              ...item,
                                              status: event.target.value as ParsedProductSuggestion["status"]
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className="rounded border border-slate-300 px-1 py-1"
                                >
                                  <option value="PENDING">Pending</option>
                                  <option value="ACCEPTED">Accept</option>
                                  <option value="REJECTED">Reject</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      onClick={() => void bulkCreateAccepted()}
                      disabled={saving}
                      className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                    >
                      Bulk Create Accepted ({acceptedSuggestions.length})
                    </button>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white">
                  <header className="border-b border-slate-200 px-3 py-2">
                    <h3 className="text-sm font-semibold text-slate-900">Product Images</h3>
                  </header>
                  <div className="space-y-3 p-3">
                    <div
                      onDragOver={(event) => {
                        event.preventDefault();
                        setBulkDropActive(true);
                      }}
                      onDragLeave={() => setBulkDropActive(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setBulkDropActive(false);
                        const files = Array.from(event.dataTransfer.files ?? []);
                        void uploadBulkImages(files);
                      }}
                      className={[
                        "rounded border-2 border-dashed p-4 text-center text-xs",
                        bulkDropActive ? "border-slate-500 bg-slate-50" : "border-slate-300 text-slate-500"
                      ].join(" ")}
                    >
                      Drag & drop product images here (bulk upload placeholder)
                    </div>
                    <div className="max-h-52 overflow-auto">
                      {loadingProducts ? (
                        <div className="text-xs text-slate-500">Loading products...</div>
                      ) : (
                        <table className="w-full border-collapse text-xs">
                          <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                            <tr>
                              <th className="border-b border-slate-200 px-2 py-2">Product</th>
                              <th className="border-b border-slate-200 px-2 py-2">Pack</th>
                              <th className="border-b border-slate-200 px-2 py-2">Upload Image</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map((product) => (
                              <tr key={product.id} className="border-b border-slate-100">
                                <td className="px-2 py-2 text-slate-700">{product.productName}</td>
                                <td className="px-2 py-2 text-slate-600">{product.variantPackSize}</td>
                                <td className="px-2 py-2">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      if (!file) {
                                        return;
                                      }
                                      void uploadSingleImage(file);
                                    }}
                                    className="w-full text-[11px]"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
