"use client";

import { useEffect, useMemo, useState } from "react";
import { orderReviewService } from "@/services/order-review.service";
import type { OrderLineItem, ReviewQueueOrder } from "@/types/order-review";
import { EmptyState } from "@/components/ui/empty-state";

type ActionType = "FULL" | "PARTIAL" | "CANCEL";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const riskPillClassMap: Record<ReviewQueueOrder["stockRisk"], string> = {
  LOW: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-rose-100 text-rose-700"
};

const paymentModeLabelMap: Record<ReviewQueueOrder["paymentMode"], string> = {
  ADVANCE: "Advance",
  COD: "COD"
};

const formatElapsed = (placedAt: string, now: number): string => {
  const diffMs = Math.max(0, now - new Date(placedAt).getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const getDefaultConfirmQuantity = (line: OrderLineItem): number =>
  Math.min(line.orderedQuantity, line.availableStock);

export function OrderReviewQueueScreen() {
  const [orders, setOrders] = useState<ReviewQueueOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<ActionType | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadQueue = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await orderReviewService.getPlacedOrders();
        const normalized = response.map((order) => ({
          ...order,
          lineItems: order.lineItems.map((line) => ({
            ...line,
            confirmQuantity:
              line.confirmQuantity > 0 ? line.confirmQuantity : getDefaultConfirmQuantity(line)
          }))
        }));
        setOrders(normalized);
        if (normalized.length > 0) {
          setSelectedOrderId(normalized[0].id);
        }
      } catch {
        setError("Unable to load placed orders.");
      } finally {
        setLoading(false);
      }
    };

    void loadQueue();
  }, []);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (left, right) => new Date(left.placedAt).getTime() - new Date(right.placedAt).getTime()
      ),
    [orders]
  );

  const selectedOrder = useMemo(
    () => sortedOrders.find((order) => order.id === selectedOrderId) ?? null,
    [selectedOrderId, sortedOrders]
  );

  const allSelected = sortedOrders.length > 0 && selectedOrderIds.length === sortedOrders.length;

  const removeOrderFromQueue = (orderId: string) => {
    setOrders((previous) => {
      const remaining = previous
        .filter((order) => order.id !== orderId)
        .sort(
          (left, right) => new Date(left.placedAt).getTime() - new Date(right.placedAt).getTime()
        );
      setSelectedOrderId((currentSelectedId) => {
        if (currentSelectedId !== orderId) {
          return currentSelectedId;
        }
        return remaining[0]?.id ?? null;
      });
      return remaining;
    });
    setSelectedOrderIds((previous) => previous.filter((id) => id !== orderId));
  };

  const updateLineItem = (
    orderId: string,
    lineItemId: string,
    updater: (current: OrderLineItem) => OrderLineItem
  ) => {
    setOrders((previous) =>
      previous.map((order) => {
        if (order.id !== orderId) {
          return order;
        }
        return {
          ...order,
          lineItems: order.lineItems.map((lineItem) =>
            lineItem.id === lineItemId ? updater(lineItem) : lineItem
          )
        };
      })
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedOrderIds([]);
      return;
    }
    setSelectedOrderIds(sortedOrders.map((order) => order.id));
  };

  const handleRowCheckboxToggle = (orderId: string) => {
    setSelectedOrderIds((previous) =>
      previous.includes(orderId) ? previous.filter((id) => id !== orderId) : [...previous, orderId]
    );
  };

  const handleConfirmFull = async () => {
    if (!selectedOrder) {
      return;
    }

    setActionInProgress("FULL");
    setError(null);
    try {
      await orderReviewService.confirmFullOrder(selectedOrder.id);
      removeOrderFromQueue(selectedOrder.id);
    } catch {
      setError("Failed to confirm full order.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmPartial = async () => {
    if (!selectedOrder) {
      return;
    }

    setActionInProgress("PARTIAL");
    setError(null);
    try {
      await orderReviewService.confirmPartialOrder(selectedOrder.id, {
        lineItems: selectedOrder.lineItems.map((line) => ({
          lineItemId: line.id,
          confirmQuantity: line.confirmQuantity,
          substituteSkuId: line.substituteSkuId
        }))
      });
      removeOrderFromQueue(selectedOrder.id);
    } catch {
      setError("Failed to confirm partial order.");
    } finally {
      setActionInProgress(null);
    }
  };

  const openCancelModal = () => {
    setCancelReason("");
    setCancelReasonError(null);
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setCancelReason("");
    setCancelReasonError(null);
  };

  const submitCancel = async () => {
    if (!selectedOrder) {
      return;
    }

    const reason = cancelReason.trim();
    if (!reason) {
      setCancelReasonError("Reason is required.");
      return;
    }

    setActionInProgress("CANCEL");
    setError(null);
    try {
      await orderReviewService.cancelOrder(selectedOrder.id, reason);
      closeCancelModal();
      removeOrderFromQueue(selectedOrder.id);
    } catch {
      setError("Failed to cancel order.");
      setActionInProgress(null);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Order Review Queue</h1>
          <p className="text-sm text-slate-600">
            Review placed orders and confirm fulfillment quantities.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Backend: <span className="font-medium">{orderReviewService.getBackendBaseUrl()}</span>
        </div>
      </div>

      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        <section className="col-span-7 flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <h2 className="text-sm font-semibold text-slate-900">Placed Orders</h2>
            <span className="text-xs text-slate-500">{selectedOrderIds.length} selected</span>
          </header>
          <div className="min-h-0 overflow-auto">
            {loading ? (
              <div className="p-4 text-sm text-slate-500">Loading queue...</div>
            ) : sortedOrders.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState
                  icon="📋"
                  title="Waiting for your first retailer order"
                  helper="Orders appear here when a connected retailer places an order through the SupplySetu app."
                  ctaLabel="Share invite link"
                  onCtaPress={() => alert("Share invite link")} // Temporary since modal logic isn't here
                  hint={
                    <>
                      <p className="mb-2 font-medium text-slate-800">How it works:</p>
                      <ol className="list-inside list-decimal space-y-1">
                        <li>Retailer receives your invite code</li>
                        <li>Retailer browses your catalog</li>
                        <li>Order appears here for your approval</li>
                        <li>You approve → dispatch → deliver</li>
                      </ol>
                    </>
                  }
                />
              </div>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-2">
                      <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
                    </th>
                    <th className="border-b border-slate-200 px-2 py-2">Order ID</th>
                    <th className="border-b border-slate-200 px-2 py-2">Retailer</th>
                    <th className="border-b border-slate-200 px-2 py-2">Area / Route</th>
                    <th className="border-b border-slate-200 px-2 py-2">Lines</th>
                    <th className="border-b border-slate-200 px-2 py-2">Value</th>
                    <th className="border-b border-slate-200 px-2 py-2">Payment</th>
                    <th className="border-b border-slate-200 px-2 py-2">Placed</th>
                    <th className="border-b border-slate-200 px-2 py-2">Stock Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order) => {
                    const isChecked = selectedOrderIds.includes(order.id);
                    const isActive = selectedOrderId === order.id;
                    return (
                      <tr
                        key={order.id}
                        className={[
                          "cursor-pointer border-b border-slate-100 hover:bg-slate-50",
                          isActive ? "bg-slate-100/70" : ""
                        ].join(" ")}
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleRowCheckboxToggle(order.id)}
                          />
                        </td>
                        <td className="px-2 py-2 font-medium text-slate-800">{order.id}</td>
                        <td className="px-2 py-2 text-slate-700">{order.retailerName}</td>
                        <td className="px-2 py-2 text-slate-700">{order.areaRoute}</td>
                        <td className="px-2 py-2 text-center text-slate-700">{order.totalLineItems}</td>
                        <td className="px-2 py-2 text-slate-700">
                          {currencyFormatter.format(order.totalOrderValue)}
                        </td>
                        <td className="px-2 py-2 text-slate-700">{paymentModeLabelMap[order.paymentMode]}</td>
                        <td className="px-2 py-2 text-slate-700">{formatElapsed(order.placedAt, now)}</td>
                        <td className="px-2 py-2">
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-0.5 font-medium",
                              riskPillClassMap[order.stockRisk]
                            ].join(" ")}
                          >
                            {order.stockRisk}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="col-span-5 flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-3 py-2">
            <h2 className="text-sm font-semibold text-slate-900">Order Detail Review</h2>
          </header>
          {!selectedOrder ? (
            <div className="p-4 text-sm text-slate-500">Select an order to review line items.</div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-slate-200 px-3 py-2 text-xs text-slate-600">
                <div className="font-medium text-slate-900">{selectedOrder.id}</div>
                <div>{selectedOrder.retailerName}</div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="border-b border-slate-200 px-2 py-2">SKU</th>
                      <th className="border-b border-slate-200 px-2 py-2">Ordered</th>
                      <th className="border-b border-slate-200 px-2 py-2">Stock</th>
                      <th className="border-b border-slate-200 px-2 py-2">Confirm Qty</th>
                      <th className="border-b border-slate-200 px-2 py-2">Substitute SKU</th>
                      <th className="border-b border-slate-200 px-2 py-2">Scheme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.lineItems.map((line) => (
                      <tr key={line.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 text-slate-800">{line.skuName}</td>
                        <td className="px-2 py-2 text-slate-700">{line.orderedQuantity}</td>
                        <td className="px-2 py-2 text-slate-700">{line.availableStock}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            max={line.orderedQuantity}
                            value={line.confirmQuantity}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              const safeValue = Number.isFinite(value)
                                ? Math.max(0, Math.min(value, line.orderedQuantity))
                                : 0;
                              updateLineItem(selectedOrder.id, line.id, (current) => ({
                                ...current,
                                confirmQuantity: safeValue
                              }));
                            }}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={line.substituteSkuId ?? ""}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateLineItem(selectedOrder.id, line.id, (current) => ({
                                ...current,
                                substituteSkuId: value || null
                              }));
                            }}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
                          >
                            <option value="">None</option>
                            {line.substituteOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <span className="inline-flex rounded bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {line.schemeLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2 border-t border-slate-200 p-3">
                <button
                  type="button"
                  onClick={handleConfirmFull}
                  disabled={actionInProgress !== null}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confirm Full Order
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPartial}
                  disabled={actionInProgress !== null}
                  className="rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confirm Partial Order
                </button>
                <button
                  type="button"
                  onClick={openCancelModal}
                  disabled={actionInProgress !== null}
                  className="rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {cancelModalOpen ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900">Cancel Order</h3>
            <p className="mt-1 text-xs text-slate-600">Provide a reason before cancellation.</p>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={4}
              className="mt-3 w-full rounded border border-slate-300 p-2 text-sm focus:border-slate-400 focus:outline-none"
              placeholder="Reason for cancellation"
            />
            {cancelReasonError ? (
              <div className="mt-1 text-xs text-rose-600">{cancelReasonError}</div>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCancelModal}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
              >
                Back
              </button>
              <button
                type="button"
                onClick={submitCancel}
                disabled={actionInProgress === "CANCEL"}
                className="rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
