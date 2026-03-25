"use client";

import { useEffect, useMemo, useState } from "react";
import { packingService } from "@/services/packing.service";
import type { PackingOrder, PackingPriority, SkuAggregate } from "@/types/packing";

type ViewMode = "ORDER" | "SKU";

const priorityClassMap: Record<PackingPriority, string> = {
  HIGH: "bg-rose-100 text-rose-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-emerald-100 text-emerald-700"
};

const progressClass = (progress: number): string => {
  if (progress < 40) {
    return "bg-rose-500";
  }
  if (progress < 80) {
    return "bg-amber-500";
  }
  return "bg-emerald-500";
};

const getOrderProgress = (order: PackingOrder): number => {
  const totalConfirmed = order.lineItems.reduce((sum, line) => sum + line.confirmedQuantity, 0);
  const totalPicked = order.lineItems.reduce((sum, line) => sum + line.pickedQuantity, 0);
  if (totalConfirmed === 0) {
    return 0;
  }
  return Math.round((totalPicked / totalConfirmed) * 100);
};

export function PackingBoardScreen() {
  const [orders, setOrders] = useState<PackingOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("ORDER");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"PACKED" | "ISSUE" | null>(null);
  const [stockIssueNote, setStockIssueNote] = useState("");

  useEffect(() => {
    const loadQueue = async () => {
      setLoading(true);
      setError(null);
      try {
        const queue = await packingService.fetchPackingQueue();
        setOrders(queue);
        setSelectedOrderId(queue[0]?.id ?? null);
      } catch {
        setError("Unable to load packing queue.");
      } finally {
        setLoading(false);
      }
    };

    void loadQueue();
  }, []);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const skuAggregates = useMemo<SkuAggregate[]>(() => packingService.aggregateSkuRequirements(orders), [orders]);

  const updateLineItem = (
    orderId: string,
    lineItemId: string,
    updater: (line: PackingOrder["lineItems"][number]) => PackingOrder["lineItems"][number]
  ) => {
    setOrders((previous) =>
      previous.map((order) => {
        if (order.id !== orderId) {
          return order;
        }
        return {
          ...order,
          lineItems: order.lineItems.map((line) => (line.id === lineItemId ? updater(line) : line))
        };
      })
    );
  };

  const persistPickedForSelectedOrder = async () => {
    if (!selectedOrder) {
      return;
    }
    await packingService.updatePickedQuantities(selectedOrder.id, {
      lineItems: selectedOrder.lineItems.map((line) => ({
        lineItemId: line.id,
        pickedQuantity: line.pickedQuantity,
        shortageFlag: line.shortageFlag
      }))
    });
  };

  const handleMarkPacked = async () => {
    if (!selectedOrder) {
      return;
    }
    setActionLoading("PACKED");
    setError(null);
    try {
      await persistPickedForSelectedOrder();
      await packingService.markOrderPacked(selectedOrder.id);
      setOrders((previous) => previous.filter((order) => order.id !== selectedOrder.id));
      setSelectedOrderId((previous) => {
        if (previous !== selectedOrder.id) {
          return previous;
        }
        const remaining = orders.filter((order) => order.id !== selectedOrder.id);
        return remaining[0]?.id ?? null;
      });
    } catch {
      setError("Failed to mark order as packed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportIssue = async () => {
    if (!selectedOrder) {
      return;
    }
    if (!stockIssueNote.trim()) {
      setError("Enter issue details before reporting.");
      return;
    }

    setActionLoading("ISSUE");
    setError(null);
    try {
      await persistPickedForSelectedOrder();
      await packingService.reportStockIssue(selectedOrder.id, stockIssueNote.trim());
      setStockIssueNote("");
    } catch {
      setError("Failed to report stock issue.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Packing Board</h1>
          <p className="text-sm text-slate-600">Execute picking and packing for confirmed orders.</p>
        </div>
        <div className="inline-flex rounded border border-slate-300 bg-white p-1 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("ORDER")}
            className={[
              "rounded px-3 py-1",
              viewMode === "ORDER" ? "bg-slate-900 text-white" : "text-slate-700"
            ].join(" ")}
          >
            Order-wise
          </button>
          <button
            type="button"
            onClick={() => setViewMode("SKU")}
            className={[
              "rounded px-3 py-1",
              viewMode === "SKU" ? "bg-slate-900 text-white" : "text-slate-700"
            ].join(" ")}
          >
            SKU-wise
          </button>
        </div>
      </div>

      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        <section className="col-span-7 flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-3 py-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {viewMode === "ORDER" ? "Orders Feed" : "SKU-wise Picking Feed"}
            </h2>
          </header>

          <div className="min-h-0 overflow-auto">
            {loading ? <div className="p-4 text-sm text-slate-500">Loading packing queue...</div> : null}

            {!loading && viewMode === "ORDER" ? (
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-2">Order ID</th>
                    <th className="border-b border-slate-200 px-2 py-2">Retailer</th>
                    <th className="border-b border-slate-200 px-2 py-2">Confirmed SKUs</th>
                    <th className="border-b border-slate-200 px-2 py-2">Progress</th>
                    <th className="border-b border-slate-200 px-2 py-2">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const progress = getOrderProgress(order);
                    const active = order.id === selectedOrderId;
                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={[
                          "cursor-pointer border-b border-slate-100 hover:bg-slate-50",
                          active ? "bg-slate-100/70" : ""
                        ].join(" ")}
                      >
                        <td className="px-2 py-2 font-medium text-slate-800">{order.id}</td>
                        <td className="px-2 py-2 text-slate-700">{order.retailerName}</td>
                        <td className="px-2 py-2 text-center text-slate-700">{order.lineItems.length}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded bg-slate-200">
                              <div
                                className={`h-2 rounded ${progressClass(progress)}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="font-medium text-slate-700">{progress}%</span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-0.5 font-medium",
                              priorityClassMap[order.priority]
                            ].join(" ")}
                          >
                            {order.priority}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}

            {!loading && viewMode === "SKU" ? (
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-2">SKU</th>
                    <th className="border-b border-slate-200 px-2 py-2">Total Required</th>
                    <th className="border-b border-slate-200 px-2 py-2">Available Stock</th>
                    <th className="border-b border-slate-200 px-2 py-2">Picked Qty</th>
                    <th className="border-b border-slate-200 px-2 py-2">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {skuAggregates.map((row) => (
                    <tr key={row.skuCode} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-800">{row.skuName}</td>
                      <td className="px-2 py-2 text-slate-700">{row.totalRequiredQuantity}</td>
                      <td className="px-2 py-2 text-slate-700">{row.availableStock}</td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          readOnly
                          value={row.pickedQuantity}
                          className="w-24 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-sm font-semibold text-slate-800"
                        />
                      </td>
                      <td className="px-2 py-2 font-medium text-slate-700">{row.remainingQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </section>

        <section className="col-span-5 flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-3 py-2">
            <h2 className="text-sm font-semibold text-slate-900">Order Packing Detail</h2>
          </header>

          {!selectedOrder ? (
            <div className="p-4 text-sm text-slate-500">Select an order to update picked quantities.</div>
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
                      <th className="border-b border-slate-200 px-2 py-2">Confirmed</th>
                      <th className="border-b border-slate-200 px-2 py-2">Picked Qty</th>
                      <th className="border-b border-slate-200 px-2 py-2">Shortage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.lineItems.map((line) => (
                      <tr key={line.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 text-slate-800">{line.skuName}</td>
                        <td className="px-2 py-2 font-medium text-slate-700">{line.confirmedQuantity}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            max={line.confirmedQuantity}
                            value={line.pickedQuantity}
                            onChange={(event) => {
                              const parsed = Number(event.target.value);
                              const safeValue = Number.isFinite(parsed)
                                ? Math.max(0, Math.min(parsed, line.confirmedQuantity))
                                : 0;
                              updateLineItem(selectedOrder.id, line.id, (current) => ({
                                ...current,
                                pickedQuantity: safeValue
                              }));
                            }}
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-base font-semibold text-slate-900 focus:border-slate-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={line.shortageFlag}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                updateLineItem(selectedOrder.id, line.id, (current) => ({
                                  ...current,
                                  shortageFlag: checked
                                }));
                              }}
                            />
                            <span className="text-slate-700">Flag</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 p-3">
                <textarea
                  rows={2}
                  value={stockIssueNote}
                  onChange={(event) => setStockIssueNote(event.target.value)}
                  placeholder="Stock issue details (optional until reporting)"
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-500 focus:outline-none"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkPacked}
                    disabled={actionLoading !== null}
                    className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Mark Order as Packed
                  </button>
                  <button
                    type="button"
                    onClick={handleReportIssue}
                    disabled={actionLoading !== null}
                    className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Report Stock Issue
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
