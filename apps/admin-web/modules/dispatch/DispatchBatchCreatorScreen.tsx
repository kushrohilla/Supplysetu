"use client";

import { useEffect, useMemo, useState } from "react";
import { dispatchService } from "@/services/dispatch.service";
import type { DispatchBatchSummary, ReadyDispatchOrder } from "@/types/dispatch";

type GroupMode = "NONE" | "AREA_ROUTE";

const paymentModeLabel: Record<ReadyDispatchOrder["paymentMode"], string> = {
  ADVANCE: "Advance",
  COD: "COD"
};

const priorityClass: Record<ReadyDispatchOrder["priority"], string> = {
  HIGH: "bg-rose-100 text-rose-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-emerald-100 text-emerald-700"
};

const VEHICLE_CAPACITY_UNITS = 120;

const formatDispatchDate = (value: string): string => {
  if (!value) {
    return "-";
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN");
};

export function DispatchBatchCreatorScreen() {
  const [orders, setOrders] = useState<ReadyDispatchOrder[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [groupMode, setGroupMode] = useState<GroupMode>("NONE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [summary, setSummary] = useState<DispatchBatchSummary | null>(null);

  const routeOptions = dispatchService.getRouteOptions();
  const vehicleOptions = dispatchService.getVehicleOptions();
  const agentOptions = dispatchService.getAgentOptions();

  const [route, setRoute] = useState(routeOptions[0]?.id ?? "");
  const [vehicleId, setVehicleId] = useState(vehicleOptions[0]?.id ?? "");
  const [agentId, setAgentId] = useState(agentOptions[0]?.id ?? "");
  const [plannedDispatchDate, setPlannedDispatchDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const queue = await dispatchService.fetchReadyToDispatchOrders();
        setOrders(queue);
      } catch {
        setError("Unable to load ready-to-dispatch orders.");
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, []);

  const sortedOrders = useMemo(() => {
    const data = [...orders];
    if (groupMode === "AREA_ROUTE") {
      data.sort((a, b) => {
        const routeCompare = a.areaRoute.localeCompare(b.areaRoute);
        if (routeCompare !== 0) {
          return routeCompare;
        }
        return a.id.localeCompare(b.id);
      });
    } else {
      data.sort((a, b) => a.id.localeCompare(b.id));
    }
    return data;
  }, [groupMode, orders]);

  const allSelected = sortedOrders.length > 0 && selectedOrderIds.length === sortedOrders.length;

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedOrderIds.includes(order.id)),
    [orders, selectedOrderIds]
  );

  const totalSelectedUnits = selectedOrders.reduce((sum, order) => sum + order.totalUnits, 0);
  const loadUtilization = Math.min(
    100,
    Math.round((totalSelectedUnits / VEHICLE_CAPACITY_UNITS) * 100 || 0)
  );

  const canCreateBatch =
    selectedOrderIds.length >= 2 &&
    Boolean(route) &&
    Boolean(vehicleId) &&
    Boolean(agentId) &&
    Boolean(plannedDispatchDate);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedOrderIds([]);
      return;
    }
    setSelectedOrderIds(sortedOrders.map((order) => order.id));
  };

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds((previous) =>
      previous.includes(orderId) ? previous.filter((id) => id !== orderId) : [...previous, orderId]
    );
  };

  const handleCreateBatch = async () => {
    if (!canCreateBatch) {
      setError("Select at least two orders and complete batch configuration.");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const created = await dispatchService.createDispatchBatch({
        orderIds: selectedOrderIds,
        route,
        vehicleId,
        agentId,
        plannedDispatchDate
      });

      await dispatchService.assignLogisticsResources(created.batchId, vehicleId, agentId);

      setOrders((previous) => previous.filter((order) => !selectedOrderIds.includes(order.id)));
      setSelectedOrderIds([]);
      setSummary(created);
    } catch {
      setError("Failed to create dispatch batch.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dispatch Batch Creator</h1>
          <p className="text-sm text-slate-600">
            Group packed orders and assign delivery resources.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="group-mode" className="text-slate-600">
            Group / Sort
          </label>
          <select
            id="group-mode"
            value={groupMode}
            onChange={(event) => setGroupMode(event.target.value as GroupMode)}
            className="rounded border border-slate-300 bg-white px-2 py-1"
          >
            <option value="NONE">Default</option>
            <option value="AREA_ROUTE">By Area / Route</option>
          </select>
        </div>
      </div>

      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        <section className="col-span-7 flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <h2 className="text-sm font-semibold text-slate-900">Packed Orders Pool</h2>
            <span className="text-xs text-slate-500">{selectedOrderIds.length} selected</span>
          </header>
          <div className="min-h-0 overflow-auto">
            {loading ? (
              <div className="p-4 text-sm text-slate-500">Loading packed orders...</div>
            ) : sortedOrders.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No orders in READY_TO_DISPATCH state.</div>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-2">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                    </th>
                    <th className="border-b border-slate-200 px-2 py-2">Order ID</th>
                    <th className="border-b border-slate-200 px-2 py-2">Retailer</th>
                    <th className="border-b border-slate-200 px-2 py-2">Area / Route</th>
                    <th className="border-b border-slate-200 px-2 py-2">Units / Cartons</th>
                    <th className="border-b border-slate-200 px-2 py-2">Payment</th>
                    <th className="border-b border-slate-200 px-2 py-2">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order) => {
                    const checked = selectedOrderIds.includes(order.id);
                    return (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOrder(order.id)}
                          />
                        </td>
                        <td className="px-2 py-2 font-medium text-slate-800">{order.id}</td>
                        <td className="px-2 py-2 text-slate-700">{order.retailerName}</td>
                        <td className="px-2 py-2 text-slate-700">{order.areaRoute}</td>
                        <td className="px-2 py-2 text-slate-700">{order.totalUnits}</td>
                        <td className="px-2 py-2 text-slate-700">{paymentModeLabel[order.paymentMode]}</td>
                        <td className="px-2 py-2">
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-0.5 font-medium",
                              priorityClass[order.priority]
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
            )}
          </div>
        </section>

        <section className="col-span-5 flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-3 py-2">
            <h2 className="text-sm font-semibold text-slate-900">Batch Builder</h2>
          </header>
          {selectedOrderIds.length < 2 ? (
            <div className="p-4 text-sm text-slate-500">
              Select at least two orders to configure dispatch batch.
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
              <label className="flex flex-col gap-1 text-xs text-slate-700">
                Route Selector
                <select
                  value={route}
                  onChange={(event) => setRoute(event.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {routeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-slate-700">
                Delivery Vehicle Selector
                <select
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {vehicleOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-slate-700">
                Delivery Agent Selector
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

              <label className="flex flex-col gap-1 text-xs text-slate-700">
                Planned Dispatch Date
                <input
                  type="date"
                  value={plannedDispatchDate}
                  onChange={(event) => setPlannedDispatchDate(event.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </label>

              <div className="rounded border border-slate-200 bg-slate-50 p-2">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span>Load Utilisation</span>
                  <span>{loadUtilization}%</span>
                </div>
                <div className="h-2 rounded bg-slate-200">
                  <div
                    className={[
                      "h-2 rounded",
                      loadUtilization > 90
                        ? "bg-rose-500"
                        : loadUtilization > 70
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    ].join(" ")}
                    style={{ width: `${loadUtilization}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {totalSelectedUnits} units selected / {VEHICLE_CAPACITY_UNITS} vehicle capacity units.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateBatch}
                disabled={actionLoading}
                className="mt-auto rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create Dispatch Batch
              </button>
            </div>
          )}
        </section>
      </div>

      {summary ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <h3 className="font-semibold">Batch Created</h3>
          <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <span>Batch ID: {summary.batchId}</span>
            <span>Total Orders: {summary.totalOrders}</span>
            <span>Assigned Route: {summary.assignedRoute}</span>
            <span>Dispatch Date: {formatDispatchDate(summary.dispatchDate)}</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
