"use client";

import { FormEvent, useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { clearAuthSession, getApiErrorMessage } from "@/services/auth.service";
import { ApiError } from "@/services/api.service";
import { inventoryService } from "@/services/inventory.service";
import type { InventoryItem } from "@/types/inventory";

type InventoryFilter = "all" | "low-stock";

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Not synced yet";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatQuantity = (value: number) => {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(3).replace(/\.?0+$/, "");
};

const getLatestSyncedAt = (items: InventoryItem[]) => {
  const timestamps = items
    .map((item) => item.last_synced_at)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime());

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
};

export function InventoryScreen() {
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockInput, setStockInput] = useState("");
  const [thresholdInput, setThresholdInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const loadInventory = async () => {
      setLoading(true);
      setError(null);

      try {
        const [items, lowStock] = await Promise.all([
          inventoryService.fetchInventory({ search }),
          inventoryService.fetchLowStockInventory({ search }),
        ]);

        setInventoryItems(items);
        setLowStockItems(lowStock);
        setLastSyncedAt((current) => current ?? getLatestSyncedAt(items));
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearAuthSession();
          router.push("/login");
          return;
        }

        setError(getApiErrorMessage(loadError, "Unable to load inventory."));
      } finally {
        setLoading(false);
      }
    };

    void loadInventory();
  }, [router, search]);

  const visibleItems = filter === "low-stock" ? lowStockItems : inventoryItems;

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    startTransition(() => {
      setSearch(searchInput.trim());
    });
  };

  const onSyncNow = async () => {
    setSyncing(true);
    setFeedback(null);
    setError(null);

    try {
      const result = await inventoryService.syncInventory();
      setLastSyncedAt(result.triggered_at);
      setFeedback(
        result.rate_limited
          ? "Sync already ran recently for this tenant. Showing the latest sync metadata."
          : `Sync complete. ${result.total_products} products reviewed, ${result.low_stock_count} low-stock items found.`,
      );

      const [items, lowStock] = await Promise.all([
        inventoryService.fetchInventory({ search }),
        inventoryService.fetchLowStockInventory({ search }),
      ]);
      setInventoryItems(items);
      setLowStockItems(lowStock);
    } catch (syncError) {
      if (syncError instanceof ApiError && syncError.status === 401) {
        clearAuthSession();
        router.push("/login");
        return;
      }

      setError(getApiErrorMessage(syncError, "Unable to sync inventory."));
    } finally {
      setSyncing(false);
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setStockInput(String(item.stock_quantity));
    setThresholdInput(String(item.low_stock_threshold));
    setModalError(null);
  };

  const closeEditModal = () => {
    setSelectedItem(null);
    setModalError(null);
    setStockInput("");
    setThresholdInput("");
  };

  const onSaveInventoryItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem) {
      return;
    }

    const stockQuantity = Number(stockInput);
    const lowStockThreshold = Number(thresholdInput);

    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      setModalError("Stock quantity must be a non-negative number.");
      return;
    }

    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
      setModalError("Low stock threshold must be a non-negative number.");
      return;
    }

    setSaving(true);
    setModalError(null);
    setFeedback(null);

    try {
      const updated = await inventoryService.updateInventoryItem(selectedItem.product_id, {
        stock_quantity: stockQuantity,
        low_stock_threshold: lowStockThreshold,
      });

      setInventoryItems((currentItems) =>
        currentItems.map((item) => (item.product_id === updated.product_id ? updated : item)),
      );
      setLowStockItems((currentItems) => {
        const nextItems = currentItems.filter((item) => item.product_id !== updated.product_id);
        if (updated.stock_quantity < updated.low_stock_threshold) {
          return [...nextItems, updated].sort((left, right) => left.product_name.localeCompare(right.product_name));
        }

        return nextItems;
      });
      setLastSyncedAt(updated.last_synced_at ?? lastSyncedAt);
      setFeedback(`Updated inventory for ${updated.product_name}.`);
      closeEditModal();
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.status === 401) {
        clearAuthSession();
        router.push("/login");
        return;
      }

      setModalError(getApiErrorMessage(saveError, "Unable to update inventory."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
            <p className="text-sm text-slate-600">
              Review snapshot-based stock, spot low-stock products, and make safe manual adjustments.
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
              Last Synced: <span className="font-medium text-slate-700">{formatDateTime(lastSyncedAt)}</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <form onSubmit={onSearchSubmit} className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by product, brand, or SKU"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Search
              </button>
            </form>

            <button
              type="button"
              onClick={() => void onSyncNow()}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" /> : null}
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl px-4 py-3 text-sm ${
          lowStockItems.length > 0
            ? "border border-amber-200 bg-amber-50 text-amber-800"
            : "border border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}
      >
        {lowStockItems.length > 0
          ? `${lowStockItems.length} product${lowStockItems.length === 1 ? "" : "s"} are below their configured threshold.`
          : "No products are currently below the configured low-stock threshold."}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All Products
        </button>
        <button
          type="button"
          onClick={() => setFilter("low-stock")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            filter === "low-stock" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Low Stock
        </button>
      </div>

      {feedback ? <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading inventory...</div>
      ) : visibleItems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon="I"
            title={search ? "No inventory items match your search" : filter === "low-stock" ? "No low-stock items" : "No inventory yet"}
            helper={
              search
                ? "Try a different product name, brand, or SKU."
                : filter === "low-stock"
                  ? "All current products are above their low-stock threshold."
                  : "Inventory snapshots will appear here once products are available for this tenant."
            }
            ctaLabel={search ? "Clear search" : undefined}
            onCtaPress={search ? () => startTransition(() => {
              setSearchInput("");
              setSearch("");
            }) : undefined}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Product Name</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Brand</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Current Stock</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Low Stock Threshold</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Last Updated</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Edit</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.product_id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                    <td className="px-4 py-3 text-slate-700">{item.brand_name ?? "Unbranded"}</td>
                    <td className="px-4 py-3 text-slate-700">{formatQuantity(item.stock_quantity)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatQuantity(item.low_stock_threshold)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(item.last_synced_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <button
            type="button"
            aria-label="Close inventory editor"
            onClick={closeEditModal}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">Edit inventory</h2>
              <p className="text-sm text-slate-600">{selectedItem.product_name}</p>
            </div>

            <form onSubmit={onSaveInventoryItem} className="flex flex-col gap-4 p-6">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-medium">Stock quantity</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={stockInput}
                  onChange={(event) => setStockInput(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-medium">Low stock threshold</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={thresholdInput}
                  onChange={(event) => setThresholdInput(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-400"
                />
              </label>

              {modalError ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{modalError}</div> : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-white" /> : null}
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
