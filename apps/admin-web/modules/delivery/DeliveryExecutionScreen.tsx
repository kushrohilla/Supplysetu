"use client";

import { useEffect, useMemo, useState } from "react";
import { deliveryService } from "@/services/delivery.service";
import type { DeliveryOrder, DeliveryStatus, SaveDeliveryUpdatesPayload } from "@/types/delivery";

const statusOptions: Array<{ value: DeliveryStatus; label: string }> = [
  { value: "DELIVERED", label: "Delivered" },
  { value: "PARTIALLY_DELIVERED", label: "Partially Delivered" },
  { value: "DELIVERY_FAILED", label: "Delivery Failed" },
  { value: "SHOP_CLOSED", label: "Shop Closed" },
  { value: "PAYMENT_ISSUE", label: "Payment Issue" }
];

const statusRowClass: Record<DeliveryStatus, string> = {
  DELIVERED: "bg-emerald-50",
  PARTIALLY_DELIVERED: "bg-amber-50",
  DELIVERY_FAILED: "bg-rose-50",
  SHOP_CLOSED: "bg-orange-50",
  PAYMENT_ISSUE: "bg-fuchsia-50"
};

const paymentLabel: Record<DeliveryOrder["paymentMode"], string> = {
  ADVANCE: "Advance",
  COD: "COD"
};

const isCodActiveStatus = (status: DeliveryStatus): boolean =>
  status === "DELIVERED" || status === "PARTIALLY_DELIVERED";

const mapLifecycleState = (
  status: DeliveryStatus
): Exclude<DeliveryOrder["lifecycleState"], "OUT_FOR_DELIVERY"> => {
  if (status === "DELIVERED") {
    return "DELIVERED";
  }
  if (status === "PARTIALLY_DELIVERED") {
    return "PARTIALLY_DELIVERED";
  }
  return "DELIVERY_FAILED";
};

export function DeliveryExecutionScreen() {
  const batchOptions = deliveryService.getBatchOptions();
  const agentOptions = deliveryService.getAgentOptions();
  const shortReasonOptions = deliveryService.getShortCollectionReasonOptions();

  const [filterType, setFilterType] = useState<"BATCH" | "AGENT">("BATCH");
  const [batchId, setBatchId] = useState(batchOptions[0]?.id ?? "");
  const [agentId, setAgentId] = useState(agentOptions[0]?.id ?? "");
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedFilterId = filterType === "BATCH" ? batchId : agentId;

  const loadOrders = async () => {
    if (!selectedFilterId) {
      setOrders([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await deliveryService.fetchDeliveryOrders(filterType, selectedFilterId);
      setOrders(response);
    } catch {
      setError("Unable to fetch out-for-delivery orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, selectedFilterId]);

  const totals = useMemo(() => {
    const packed = orders.reduce((sum, order) => sum + order.packedQuantity, 0);
    const delivered = orders.reduce((sum, order) => sum + order.deliveredQuantity, 0);
    return { packed, delivered };
  }, [orders]);

  const updateOrder = (orderId: string, updater: (order: DeliveryOrder) => DeliveryOrder) => {
    setOrders((previous) =>
      previous.map((order) => (order.id === orderId ? updater(order) : order))
    );
  };

  const handleSave = async () => {
    if (!selectedFilterId) {
      setError("Select a batch or delivery agent first.");
      return;
    }

    if (orders.length === 0) {
      setError("No orders available to update.");
      return;
    }

    const updates = orders.map((order) => {
      const lifecycleState = mapLifecycleState(order.deliveryStatus);
      const codEnabled = order.paymentMode === "COD" && isCodActiveStatus(order.deliveryStatus);
      const paymentStatus: DeliveryOrder["paymentStatus"] =
        order.paymentMode === "ADVANCE"
          ? "PAID"
          : codEnabled
            ? order.collectedAmount >= order.expectedCodAmount && order.expectedCodAmount > 0
              ? "COD_COLLECTED"
              : "COD_SHORT"
            : "COD_PENDING";

      return {
        orderId: order.id,
        deliveredQuantity: order.deliveredQuantity,
        deliveryStatus: order.deliveryStatus,
        lifecycleState,
        paymentStatus,
        cod: codEnabled
          ? {
              expectedAmount: order.expectedCodAmount,
              collectedAmount: order.collectedAmount,
              shortCollectionReason: order.shortCollectionReason
            }
          : null
      };
    });

    const payload: SaveDeliveryUpdatesPayload = {
      filterType,
      filterId: selectedFilterId,
      updates
    };

    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await deliveryService.updateDeliveryResults(payload);

      const codShortPayload: SaveDeliveryUpdatesPayload = {
        filterType,
        filterId: selectedFilterId,
        updates: updates.filter(
          (item) =>
            item.cod &&
            item.paymentStatus === "COD_SHORT" &&
            item.cod.collectedAmount < item.cod.expectedAmount
        )
      };

      if (codShortPayload.updates.length > 0) {
        await deliveryService.recordCodCollection(codShortPayload);
      }

      setOrders([]);
      setSuccessMessage("Delivery updates saved. Lifecycle and COD closure statuses updated.");
    } catch {
      setError("Failed to save delivery updates.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Delivery Execution & COD Closure</h1>
          <p className="text-sm text-slate-600">
            Capture final delivery outcomes and COD collections.
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-700">
            Filter Mode
            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value as "BATCH" | "AGENT")}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="BATCH">Dispatch Batch ID</option>
              <option value="AGENT">Delivery Agent</option>
            </select>
          </label>

          {filterType === "BATCH" ? (
            <label className="flex flex-col gap-1 text-xs text-slate-700">
              Dispatch Batch ID
              <select
                value={batchId}
                onChange={(event) => setBatchId(event.target.value)}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                {batchOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-xs text-slate-700">
              Delivery Agent
              <select
                value={agentId}
                onChange={(event) => setAgentId(event.target.value)}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                {agentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={() => void loadOrders()}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
          >
            Reload
          </button>

          <div className="ml-auto flex gap-6 text-xs text-slate-600">
            <span>Total Packed Qty: {totals.packed}</span>
            <span>Total Delivered Qty: {totals.delivered}</span>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {successMessage ? (
        <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{successMessage}</div>
      ) : null}

      <section className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Loading out-for-delivery orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">
            No orders in OUT_FOR_DELIVERY state for selected filter.
          </div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-2 py-2">Order ID</th>
                <th className="border-b border-slate-200 px-2 py-2">Retailer</th>
                <th className="border-b border-slate-200 px-2 py-2">Area / Route</th>
                <th className="border-b border-slate-200 px-2 py-2">Payment</th>
                <th className="border-b border-slate-200 px-2 py-2">Packed Qty</th>
                <th className="border-b border-slate-200 px-2 py-2">Delivered Qty</th>
                <th className="border-b border-slate-200 px-2 py-2">Delivery Status</th>
                <th className="border-b border-slate-200 px-2 py-2">Expected COD</th>
                <th className="border-b border-slate-200 px-2 py-2">Collected</th>
                <th className="border-b border-slate-200 px-2 py-2">Short Reason</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const showCodFields =
                  order.paymentMode === "COD" && isCodActiveStatus(order.deliveryStatus);
                const shouldShowShortReason =
                  showCodFields && order.collectedAmount < order.expectedCodAmount;

                return (
                  <tr
                    key={order.id}
                    className={`${statusRowClass[order.deliveryStatus]} border-b border-slate-100`}
                  >
                    <td className="px-2 py-2 font-medium text-slate-800">{order.id}</td>
                    <td className="px-2 py-2 text-slate-700">{order.retailerName}</td>
                    <td className="px-2 py-2 text-slate-700">{order.areaRoute}</td>
                    <td className="px-2 py-2 text-slate-700">{paymentLabel[order.paymentMode]}</td>
                    <td className="px-2 py-2 text-slate-700">{order.packedQuantity}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        max={order.packedQuantity}
                        value={order.deliveredQuantity}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          const safe = Number.isFinite(parsed)
                            ? Math.max(0, Math.min(parsed, order.packedQuantity))
                            : 0;
                          updateOrder(order.id, (current) => ({
                            ...current,
                            deliveredQuantity: safe
                          }));
                        }}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-900"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={order.deliveryStatus}
                        onChange={(event) =>
                          updateOrder(order.id, (current) => ({
                            ...current,
                            deliveryStatus: event.target.value as DeliveryStatus
                          }))
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      {showCodFields ? (
                        <input
                          type="number"
                          min={0}
                          value={order.expectedCodAmount}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            const safe = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                            updateOrder(order.id, (current) => ({
                              ...current,
                              expectedCodAmount: safe
                            }));
                          }}
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {showCodFields ? (
                        <input
                          type="number"
                          min={0}
                          value={order.collectedAmount}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            const safe = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                            updateOrder(order.id, (current) => ({
                              ...current,
                              collectedAmount: safe
                            }));
                          }}
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {shouldShowShortReason ? (
                        <select
                          value={order.shortCollectionReason}
                          onChange={(event) =>
                            updateOrder(order.id, (current) => ({
                              ...current,
                              shortCollectionReason: event.target.value
                            }))
                          }
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="">Select reason</option>
                          {shortReasonOptions.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || loading || orders.length === 0}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save Batch Delivery Updates
        </button>
      </div>
    </div>
  );
}
