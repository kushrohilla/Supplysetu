"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { clearAuthSession, getApiErrorMessage } from "@/services/auth.service";
import { ApiError } from "@/services/api.service";
import { dispatchService } from "@/services/dispatch.service";
import type {
  DispatchBatchListRecord,
  DeliverySheetRecord,
} from "@/types/dispatch";

// ── Helpers ──────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });

const STATUS_PILL: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  DISPATCHED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
};

// ── Main Screen ──────────────────────────────────────────────────────

export function PackingScreen() {
  const router = useRouter();

  const [batches, setBatches] = useState<DispatchBatchListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Expanded batch sheet ───────────────────────────────────────────
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<DeliverySheetRecord | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        clearAuthSession();
        router.push("/login");
        return true;
      }
      return false;
    },
    [router],
  );

  // ── Load pending batches ───────────────────────────────────────────
  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await dispatchService.listBatches();
      setBatches(all.filter((b) => b.status === "PENDING"));
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(getApiErrorMessage(err, "Unable to load batches."));
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  // ── Toggle batch expansion ─────────────────────────────────────────
  const toggleBatch = async (batchId: string) => {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null);
      setSheet(null);
      return;
    }
    setExpandedBatchId(batchId);
    setSheet(null);
    setSheetError(null);
    setSheetLoading(true);
    try {
      const data = await dispatchService.getBatchSheet(batchId);
      setSheet(data);
    } catch (err) {
      if (!handleAuthError(err)) {
        setSheetError(getApiErrorMessage(err, "Unable to load packing details."));
      }
    } finally {
      setSheetLoading(false);
    }
  };

  // ── Aggregate items across the whole sheet for a packing summary ──
  const aggregateItems = (sheetData: DeliverySheetRecord) => {
    const map = new Map<string, { product_name: string; brand_name: string | null; total_qty: number }>();
    for (const rg of sheetData.retailers) {
      for (const order of rg.orders) {
        for (const item of order.items) {
          const key = item.product_id;
          const existing = map.get(key);
          if (existing) {
            existing.total_qty += item.quantity;
          } else {
            map.set(key, {
              product_name: item.product_name,
              brand_name: item.brand_name,
              total_qty: item.quantity,
            });
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.product_name.localeCompare(b.product_name));
  };

  // ── Group batches by delivery date ─────────────────────────────────
  const batchesByDate = batches.reduce<Record<string, DispatchBatchListRecord[]>>((acc, batch) => {
    const dateKey = batch.delivery_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(batch);
    return acc;
  }, {});

  const sortedDates = Object.keys(batchesByDate).sort();

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Packing Queue</h1>
        <p className="text-sm text-slate-600">
          Review pending dispatch batches and their items for packing preparation.
        </p>
      </div>

      {error && <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading packing queue…
        </div>
      ) : batches.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon="📋"
            title="Nothing to pack"
            helper="Pending dispatch batches will appear here. Create a batch from the Dispatch page to start."
          />
        </div>
      ) : (
        sortedDates.map((dateKey) => (
          <div key={dateKey}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Delivery: {formatDate(dateKey)}
            </h2>

            <div className="flex flex-col gap-3">
              {batchesByDate[dateKey].map((batch) => {
                const isExpanded = expandedBatchId === batch.id;

                return (
                  <div
                    key={batch.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* Batch header row */}
                    <button
                      type="button"
                      onClick={() => void toggleBatch(batch.id)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base font-semibold text-slate-900">{batch.route_name}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL[batch.status]}`}
                        >
                          {batch.status}
                        </span>
                        <span className="text-sm text-slate-500">{batch.order_count} orders</span>
                      </div>
                      <span className="text-sm text-slate-400">{isExpanded ? "▲" : "▼"}</span>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-slate-200">
                        {sheetLoading ? (
                          <div className="p-5 text-sm text-slate-500">Loading packing details…</div>
                        ) : sheetError ? (
                          <div className="p-5">
                            <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{sheetError}</div>
                          </div>
                        ) : sheet ? (
                          <div className="flex flex-col gap-4 p-5">
                            {/* Aggregated pick list */}
                            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Aggregated Pick List
                              </h3>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="text-left text-slate-500">
                                    <tr>
                                      <th className="pb-2 font-medium">Product</th>
                                      <th className="pb-2 font-medium">Brand</th>
                                      <th className="pb-2 text-right font-medium">Total Qty</th>
                                    </tr>
                                  </thead>
                                  <tbody className="text-slate-700">
                                    {aggregateItems(sheet).map((ag) => (
                                      <tr key={ag.product_name} className="border-t border-slate-100">
                                        <td className="py-1.5 font-medium text-slate-900">{ag.product_name}</td>
                                        <td className="py-1.5">{ag.brand_name || "—"}</td>
                                        <td className="py-1.5 text-right font-semibold">{ag.total_qty}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </section>

                            {/* Per-retailer breakdown */}
                            {sheet.retailers.map((rg) => (
                              <section
                                key={rg.retailer.id}
                                className="rounded-xl border border-slate-200 bg-white"
                              >
                                <div className="border-b border-slate-200 px-4 py-3">
                                  <h4 className="text-sm font-semibold text-slate-900">
                                    {rg.sequence_no}. {rg.retailer.name}
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    {rg.totals.order_count} order{rg.totals.order_count !== 1 ? "s" : ""} ·{" "}
                                    {formatCurrency(rg.totals.total_value)}
                                  </p>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {rg.orders.map((order) => (
                                    <div key={order.id} className="px-4 py-3">
                                      <p className="mb-1 text-sm font-medium text-slate-900">
                                        {order.order_number}
                                        <span className="ml-2 text-xs text-slate-500">{formatCurrency(order.total_amount)}</span>
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {order.items.map((item) => (
                                          <span
                                            key={item.id}
                                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                                          >
                                            <span className="font-medium">{item.product_name}</span>
                                            <span className="text-slate-500">×{item.quantity}</span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
