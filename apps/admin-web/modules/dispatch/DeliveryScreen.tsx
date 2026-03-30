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

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

const STATUS_PILL: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  DISPATCHED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  PACKED: "bg-violet-100 text-violet-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
};

// ── Main Screen ──────────────────────────────────────────────────────

export function DeliveryScreen() {
  const router = useRouter();

  // ── Batches list ───────────────────────────────────────────────────
  const [batches, setBatches] = useState<DispatchBatchListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Delivery sheet detail ──────────────────────────────────────────
  const [sheetBatchId, setSheetBatchId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<DeliverySheetRecord | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // ── Deliver action ─────────────────────────────────────────────────
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);

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

  // ── Load dispatched batches ────────────────────────────────────────
  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await dispatchService.listBatches();
      // Show DISPATCHED batches first (today's work), then COMPLETED for reference
      const dispatched = all.filter((b) => b.status === "DISPATCHED" || b.status === "COMPLETED");
      setBatches(dispatched);
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(getApiErrorMessage(err, "Unable to load dispatch batches."));
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  // ── Open delivery sheet ────────────────────────────────────────────
  const openSheet = async (batchId: string) => {
    setSheetBatchId(batchId);
    setSheet(null);
    setSheetError(null);
    setSheetLoading(true);
    try {
      const data = await dispatchService.getBatchSheet(batchId);
      setSheet(data);
    } catch (err) {
      if (!handleAuthError(err)) {
        setSheetError(getApiErrorMessage(err, "Unable to load delivery sheet."));
      }
    } finally {
      setSheetLoading(false);
    }
  };

  const closeSheet = () => {
    setSheetBatchId(null);
    setSheet(null);
  };

  // ── Deliver order ──────────────────────────────────────────────────
  const handleDeliverOrder = async (orderId: string) => {
    if (deliveringOrderId) return;
    setDeliveringOrderId(orderId);
    try {
      await dispatchService.deliverOrder(orderId);
      // Refresh current sheet and batches
      if (sheetBatchId) {
        void openSheet(sheetBatchId);
      }
      void loadBatches();
    } catch (err) {
      if (!handleAuthError(err)) {
        setSheetError(getApiErrorMessage(err, "Failed to mark order as delivered."));
      }
    } finally {
      setDeliveringOrderId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  const dispatchedBatches = batches.filter((b) => b.status === "DISPATCHED");
  const completedBatches = batches.filter((b) => b.status === "COMPLETED");

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Delivery Operations</h1>
        <p className="text-sm text-slate-600">
          Track dispatched batches and mark orders as delivered.
        </p>
      </div>

      {error && <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading dispatched batches…
        </div>
      ) : batches.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon="🚚"
            title="No dispatched batches"
            helper="Batches need to be dispatched from the Dispatch page before delivery tracking begins."
          />
        </div>
      ) : (
        <>
          {/* Dispatched (active) batches */}
          {dispatchedBatches.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Active — Dispatched
              </h2>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Route</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Delivery Date</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Orders</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Status</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatchedBatches.map((batch) => (
                        <tr key={batch.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-3 font-medium text-slate-900">{batch.route_name}</td>
                          <td className="px-4 py-3 text-slate-700">{formatDate(batch.delivery_date)}</td>
                          <td className="px-4 py-3 text-slate-700">{batch.order_count}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL[batch.status]}`}>
                              {batch.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => void openSheet(batch.id)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                            >
                              Manage Delivery
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Completed batches */}
          {completedBatches.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Completed
              </h2>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Route</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Delivery Date</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Orders</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Status</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedBatches.map((batch) => (
                        <tr key={batch.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-3 font-medium text-slate-900">{batch.route_name}</td>
                          <td className="px-4 py-3 text-slate-700">{formatDate(batch.delivery_date)}</td>
                          <td className="px-4 py-3 text-slate-700">{batch.order_count}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL[batch.status]}`}>
                              {batch.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => void openSheet(batch.id)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                            >
                              View Sheet
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Delivery Sheet Slide-Over
         ═══════════════════════════════════════════════════════════════ */}
      {sheetBatchId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25">
          <button type="button" aria-label="Close sheet" onClick={closeSheet} className="absolute inset-0 cursor-default" />
          <div className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Delivery Sheet</h2>
                <p className="text-sm text-slate-600">Mark individual orders as delivered.</p>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                Close
              </button>
            </div>

            {sheetLoading ? (
              <div className="p-6 text-sm text-slate-500">Loading delivery sheet…</div>
            ) : sheetError ? (
              <div className="p-6">
                <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{sheetError}</div>
              </div>
            ) : sheet ? (
              <div className="flex flex-col gap-5 p-6">
                {/* Batch summary */}
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">Route</p>
                      <p className="text-sm font-medium text-slate-900">{sheet.route.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Delivery Date</p>
                      <p className="text-sm font-medium text-slate-900">{formatDate(sheet.batch.delivery_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Status</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL[sheet.batch.status] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {sheet.batch.status}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Retailers & orders with delivery action */}
                {sheet.retailers.map((rg) => (
                  <section key={rg.retailer.id} className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            {rg.sequence_no}. {rg.retailer.name}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {[rg.retailer.phone, rg.retailer.locality, rg.retailer.city].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(rg.totals.total_value)}</p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {rg.orders.map((order) => {
                        const isDelivered = order.status === "DELIVERED";
                        const canDeliver = order.status === "DISPATCHED";
                        const isDelivering = deliveringOrderId === order.id;

                        return (
                          <div key={order.id} className="px-4 py-3">
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">{order.order_number}</span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[order.status] ?? "bg-slate-100 text-slate-700"}`}
                                >
                                  {order.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-slate-900">
                                  {formatCurrency(order.total_amount)}
                                </span>
                                {canDeliver && (
                                  <button
                                    type="button"
                                    disabled={isDelivering}
                                    onClick={() => void handleDeliverOrder(order.id)}
                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isDelivering ? "Delivering…" : "Mark Delivered"}
                                  </button>
                                )}
                                {isDelivered && (
                                  <span className="text-xs font-medium text-emerald-600">✓ Delivered</span>
                                )}
                              </div>
                            </div>

                            {/* Line items */}
                            <table className="w-full text-xs">
                              <thead className="text-slate-500">
                                <tr>
                                  <th className="pb-1 text-left font-medium">Product</th>
                                  <th className="pb-1 text-right font-medium">Qty</th>
                                  <th className="pb-1 text-right font-medium">Total</th>
                                </tr>
                              </thead>
                              <tbody className="text-slate-700">
                                {order.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="py-0.5">
                                      {item.product_name}
                                      {item.brand_name ? <span className="ml-1 text-slate-400">({item.brand_name})</span> : null}
                                    </td>
                                    <td className="py-0.5 text-right">{item.quantity}</td>
                                    <td className="py-0.5 text-right">{formatCurrency(item.total_price)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {order.delivered_at && (
                              <p className="mt-1 text-xs text-slate-500">
                                Delivered at {formatDateTime(order.delivered_at)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
