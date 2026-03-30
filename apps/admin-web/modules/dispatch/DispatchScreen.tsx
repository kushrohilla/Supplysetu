"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { clearAuthSession, getApiErrorMessage } from "@/services/auth.service";
import { ApiError } from "@/services/api.service";
import { dispatchService } from "@/services/dispatch.service";
import { retailerService } from "@/services/retailer.service";
import { orderService } from "@/services/order.service";
import type {
  DispatchRouteRecord,
  DispatchBatchListRecord,
  DeliverySheetRecord,
  CreateRoutePayload,
  CreateBatchPayload,
} from "@/types/dispatch";
import type { AdminRetailerListItem } from "@/types/retailer";
import type { Order } from "@/types/order";

// ── Helpers ──────────────────────────────────────────────────────────

type ActiveTab = "routes" | "batches";

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

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const STATUS_PILL: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  DISPATCHED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
};

const BATCHABLE_STATUSES = new Set(["CONFIRMED", "PACKED"]);

// ── Main Screen ──────────────────────────────────────────────────────

export function DispatchScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("routes");

  // ── Routes state ───────────────────────────────────────────────────
  const [routes, setRoutes] = useState<DispatchRouteRecord[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState<string | null>(null);

  // ── Batches state ──────────────────────────────────────────────────
  const [batches, setBatches] = useState<DispatchBatchListRecord[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [batchesError, setBatchesError] = useState<string | null>(null);

  // ── Create Route modal ─────────────────────────────────────────────
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [crName, setCrName] = useState("");
  const [crDesc, setCrDesc] = useState("");
  const [crSelectedRetailers, setCrSelectedRetailers] = useState<string[]>([]);
  const [crRetailerOptions, setCrRetailerOptions] = useState<AdminRetailerListItem[]>([]);
  const [crRetailerSearch, setCrRetailerSearch] = useState("");
  const [crSubmitting, setCrSubmitting] = useState(false);
  const [crError, setCrError] = useState<string | null>(null);
  const [crSuccess, setCrSuccess] = useState(false);

  // ── Create Batch modal ─────────────────────────────────────────────
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [cbRouteId, setCbRouteId] = useState("");
  const [cbDate, setCbDate] = useState(todayISO());
  const [cbSelectedOrders, setCbSelectedOrders] = useState<string[]>([]);
  const [cbOrders, setCbOrders] = useState<Order[]>([]);
  const [cbSubmitting, setCbSubmitting] = useState(false);
  const [cbError, setCbError] = useState<string | null>(null);
  const [cbSuccess, setCbSuccess] = useState(false);

  // ── Batch detail sheet ─────────────────────────────────────────────
  const [sheetBatchId, setSheetBatchId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<DeliverySheetRecord | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);

  // ── Edit route retailers ───────────────────────────────────────────
  const [editRouteId, setEditRouteId] = useState<string | null>(null);
  const [editRetailerIds, setEditRetailerIds] = useState<string[]>([]);
  const [editRetailerOptions, setEditRetailerOptions] = useState<AdminRetailerListItem[]>([]);
  const [editRetailerSearch, setEditRetailerSearch] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // ── Auth redirect helper ───────────────────────────────────────────
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

  // ── Load routes ────────────────────────────────────────────────────
  const loadRoutes = useCallback(async () => {
    setRoutesLoading(true);
    setRoutesError(null);
    try {
      const data = await dispatchService.listRoutes();
      setRoutes(data);
    } catch (err) {
      if (!handleAuthError(err)) {
        setRoutesError(getApiErrorMessage(err, "Unable to load routes."));
      }
    } finally {
      setRoutesLoading(false);
    }
  }, [handleAuthError]);

  // ── Load batches ───────────────────────────────────────────────────
  const loadBatches = useCallback(async () => {
    setBatchesLoading(true);
    setBatchesError(null);
    try {
      const data = await dispatchService.listBatches();
      setBatches(data);
    } catch (err) {
      if (!handleAuthError(err)) {
        setBatchesError(getApiErrorMessage(err, "Unable to load dispatch batches."));
      }
    } finally {
      setBatchesLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    if (activeTab === "routes") {
      void loadRoutes();
    } else {
      void loadBatches();
    }
  }, [activeTab, loadRoutes, loadBatches]);

  // ── Open create route modal ────────────────────────────────────────
  const openCreateRoute = async () => {
    setShowCreateRoute(true);
    setCrName("");
    setCrDesc("");
    setCrSelectedRetailers([]);
    setCrError(null);
    setCrSuccess(false);
    setCrRetailerSearch("");
    try {
      const data = await retailerService.fetchAdminRetailers({ limit: 200 });
      setCrRetailerOptions(data.items);
    } catch (err) {
      if (!handleAuthError(err)) {
        setCrError(getApiErrorMessage(err, "Unable to load retailers."));
      }
    }
  };

  const submitCreateRoute = async (e: FormEvent) => {
    e.preventDefault();
    if (crSubmitting) return;
    setCrSubmitting(true);
    setCrError(null);
    const payload: CreateRoutePayload = {
      name: crName.trim(),
      description: crDesc.trim() || undefined,
      retailer_ids: crSelectedRetailers,
    };
    try {
      await dispatchService.createRoute(payload);
      setCrSuccess(true);
      void loadRoutes();
      setTimeout(() => setShowCreateRoute(false), 800);
    } catch (err) {
      if (!handleAuthError(err)) {
        setCrError(getApiErrorMessage(err, "Failed to create route."));
      }
    } finally {
      setCrSubmitting(false);
    }
  };

  // ── Open create batch modal ────────────────────────────────────────
  const openCreateBatch = async () => {
    setShowCreateBatch(true);
    setCbRouteId("");
    setCbDate(todayISO());
    setCbSelectedOrders([]);
    setCbError(null);
    setCbSuccess(false);
    if (routes.length === 0) {
      try {
        const data = await dispatchService.listRoutes();
        setRoutes(data);
      } catch (err) {
        if (!handleAuthError(err)) {
          setCbError(getApiErrorMessage(err, "Unable to load routes."));
        }
      }
    }
    try {
      const data = await orderService.fetchOrders();
      setCbOrders(data.filter((o) => BATCHABLE_STATUSES.has(o.status)));
    } catch (err) {
      if (!handleAuthError(err)) {
        setCbError(getApiErrorMessage(err, "Unable to load orders."));
      }
    }
  };

  const submitCreateBatch = async (e: FormEvent) => {
    e.preventDefault();
    if (cbSubmitting) return;
    if (!cbRouteId) {
      setCbError("Please select a route.");
      return;
    }
    if (cbSelectedOrders.length === 0) {
      setCbError("Please select at least one order.");
      return;
    }
    setCbSubmitting(true);
    setCbError(null);
    const payload: CreateBatchPayload = {
      route_id: cbRouteId,
      delivery_date: cbDate,
      order_ids: cbSelectedOrders,
    };
    try {
      await dispatchService.createBatch(payload);
      setCbSuccess(true);
      void loadBatches();
      setTimeout(() => setShowCreateBatch(false), 800);
    } catch (err) {
      if (!handleAuthError(err)) {
        setCbError(getApiErrorMessage(err, "Failed to create dispatch batch."));
      }
    } finally {
      setCbSubmitting(false);
    }
  };

  // ── Open batch detail sheet ────────────────────────────────────────
  const openBatchSheet = async (batchId: string) => {
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

  const closeBatchSheet = () => {
    setSheetBatchId(null);
    setSheet(null);
  };

  // ── Dispatch batch ─────────────────────────────────────────────────
  const handleDispatchBatch = async (batchId: string) => {
    if (dispatching) return;
    setDispatching(true);
    try {
      await dispatchService.dispatchBatch(batchId);
      void loadBatches();
      void openBatchSheet(batchId);
    } catch (err) {
      if (!handleAuthError(err)) {
        setSheetError(getApiErrorMessage(err, "Failed to mark batch as dispatched."));
      }
    } finally {
      setDispatching(false);
    }
  };

  // ── Edit route retailers ───────────────────────────────────────────
  const openEditRouteRetailers = async (routeId: string) => {
    setEditRouteId(routeId);
    setEditRetailerIds([]);
    setEditError(null);
    setEditSuccess(false);
    setEditRetailerSearch("");
    try {
      const data = await retailerService.fetchAdminRetailers({ limit: 200 });
      setEditRetailerOptions(data.items);
    } catch (err) {
      if (!handleAuthError(err)) {
        setEditError(getApiErrorMessage(err, "Unable to load retailers."));
      }
    }
  };

  const submitEditRouteRetailers = async (e: FormEvent) => {
    e.preventDefault();
    if (editSubmitting || !editRouteId) return;
    if (editRetailerIds.length === 0) {
      setEditError("Please select at least one retailer.");
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await dispatchService.assignRouteRetailers(editRouteId, { retailer_ids: editRetailerIds });
      setEditSuccess(true);
      void loadRoutes();
      setTimeout(() => setEditRouteId(null), 800);
    } catch (err) {
      if (!handleAuthError(err)) {
        setEditError(getApiErrorMessage(err, "Failed to update route retailers."));
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Retailer checkbox toggle helper ────────────────────────────────
  const toggleRetailer = (id: string, selected: string[], setSelected: (ids: string[]) => void) => {
    setSelected(selected.includes(id) ? selected.filter((r) => r !== id) : [...selected, id]);
  };

  // ── Order checkbox toggle ──────────────────────────────────────────
  const toggleOrder = (id: string) => {
    setCbSelectedOrders((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]));
  };

  // ── Filtered retailer lists ────────────────────────────────────────
  const filteredCrRetailers = crRetailerSearch.trim()
    ? crRetailerOptions.filter(
        (r) =>
          r.name.toLowerCase().includes(crRetailerSearch.toLowerCase()) ||
          r.phone.includes(crRetailerSearch),
      )
    : crRetailerOptions;

  const filteredEditRetailers = editRetailerSearch.trim()
    ? editRetailerOptions.filter(
        (r) =>
          r.name.toLowerCase().includes(editRetailerSearch.toLowerCase()) ||
          r.phone.includes(editRetailerSearch),
      )
    : editRetailerOptions;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dispatch Operations</h1>
          <p className="text-sm text-slate-600">
            Manage delivery routes, create dispatch batches, and inspect delivery sheets.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "routes" ? (
            <button
              type="button"
              onClick={() => void openCreateRoute()}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Create Route
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void openCreateBatch()}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Create Batch
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {(["routes", "batches"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium capitalize transition ${
              activeTab === tab
                ? "bg-slate-900 text-white shadow"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Routes Tab ──────────────────────────────────────────────── */}
      {activeTab === "routes" && (
        <>
          {routesError ? (
            <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{routesError}</div>
          ) : null}

          {routesLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Loading routes…
            </div>
          ) : routes.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon="🛣️"
                title="No routes yet"
                helper="Create your first delivery route by adding retailers grouped by geography or schedule."
                ctaLabel="Create Route"
                onCtaPress={() => void openCreateRoute()}
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Route Name</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Description</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Retailers</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Created</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route) => (
                      <tr key={route.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3 font-medium text-slate-900">{route.name}</td>
                        <td className="px-4 py-3 text-slate-600">{route.description || "—"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {route.retailer_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(route.created_at)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void openEditRouteRetailers(route.id)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            Edit Retailers
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Batches Tab ─────────────────────────────────────────────── */}
      {activeTab === "batches" && (
        <>
          {batchesError ? (
            <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{batchesError}</div>
          ) : null}

          {batchesLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Loading dispatch batches…
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon="📦"
                title="No dispatch batches"
                helper="Create a batch by selecting a route and assigning eligible orders to it."
                ctaLabel="Create Batch"
                onCtaPress={() => void openCreateBatch()}
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Route</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Delivery Date</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Orders</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Status</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Created</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => (
                      <tr key={batch.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3 font-medium text-slate-900">{batch.route_name}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(batch.delivery_date)}</td>
                        <td className="px-4 py-3 text-slate-700">{batch.order_count}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL[batch.status] ?? "bg-slate-100 text-slate-700"}`}
                          >
                            {batch.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDateTime(batch.created_at)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void openBatchSheet(batch.id)}
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
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Create Route Modal
         ═══════════════════════════════════════════════════════════════ */}
      {showCreateRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Create Delivery Route</h2>
              <button
                type="button"
                onClick={() => setShowCreateRoute(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <form onSubmit={(e) => void submitCreateRoute(e)} className="flex flex-col gap-4 px-6 py-5">
              {crError && <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{crError}</div>}
              {crSuccess && (
                <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">
                  Route created successfully!
                </div>
              )}

              <div>
                <label htmlFor="cr-name" className="mb-1 block text-sm font-medium text-slate-700">
                  Route Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="cr-name"
                  value={crName}
                  onChange={(e) => setCrName(e.target.value)}
                  required
                  maxLength={160}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="e.g. North Ahmedabad Route"
                />
              </div>

              <div>
                <label htmlFor="cr-desc" className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <input
                  id="cr-desc"
                  value={crDesc}
                  onChange={(e) => setCrDesc(e.target.value)}
                  maxLength={500}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Assign Retailers <span className="text-rose-500">*</span>
                </label>
                <input
                  value={crRetailerSearch}
                  onChange={(e) => setCrRetailerSearch(e.target.value)}
                  placeholder="Search retailers…"
                  className="mb-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {filteredCrRetailers.length === 0 ? (
                    <p className="px-2 py-1 text-sm text-slate-500">No retailers found.</p>
                  ) : (
                    filteredCrRetailers.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100">
                        <input
                          type="checkbox"
                          checked={crSelectedRetailers.includes(r.id)}
                          onChange={() => toggleRetailer(r.id, crSelectedRetailers, setCrSelectedRetailers)}
                          className="accent-slate-900"
                        />
                        <span className="text-slate-900">{r.name}</span>
                        <span className="text-xs text-slate-500">{r.phone}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">{crSelectedRetailers.length} selected</p>
              </div>

              <button
                type="submit"
                disabled={crSubmitting || crSuccess || crSelectedRetailers.length === 0 || !crName.trim()}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {crSubmitting ? "Creating…" : "Create Route"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Create Batch Modal
         ═══════════════════════════════════════════════════════════════ */}
      {showCreateBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Create Dispatch Batch</h2>
              <button
                type="button"
                onClick={() => setShowCreateBatch(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <form onSubmit={(e) => void submitCreateBatch(e)} className="flex flex-col gap-4 px-6 py-5">
              {cbError && <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{cbError}</div>}
              {cbSuccess && (
                <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">
                  Dispatch batch created!
                </div>
              )}

              <div>
                <label htmlFor="cb-route" className="mb-1 block text-sm font-medium text-slate-700">
                  Route <span className="text-rose-500">*</span>
                </label>
                <select
                  id="cb-route"
                  value={cbRouteId}
                  onChange={(e) => setCbRouteId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  <option value="">Select a route</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.retailer_count} retailers)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cb-date" className="mb-1 block text-sm font-medium text-slate-700">
                  Delivery Date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="cb-date"
                  type="date"
                  value={cbDate}
                  onChange={(e) => setCbDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Eligible Orders (CONFIRMED / PACKED) <span className="text-rose-500">*</span>
                </label>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {cbOrders.length === 0 ? (
                    <p className="px-2 py-1 text-sm text-slate-500">No eligible orders found.</p>
                  ) : (
                    cbOrders.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100">
                        <input
                          type="checkbox"
                          checked={cbSelectedOrders.includes(o.id)}
                          onChange={() => toggleOrder(o.id)}
                          className="accent-slate-900"
                        />
                        <span className="font-medium text-slate-900">{o.order_number}</span>
                        <span className="text-slate-600">{o.retailer_name}</span>
                        <span className="ml-auto text-xs text-slate-500">{formatCurrency(o.total_amount)}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">{cbSelectedOrders.length} selected</p>
              </div>

              <button
                type="submit"
                disabled={cbSubmitting || cbSuccess || cbSelectedOrders.length === 0 || !cbRouteId}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cbSubmitting ? "Creating…" : "Create Batch"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Batch Detail / Delivery Sheet Slide-Over
         ═══════════════════════════════════════════════════════════════ */}
      {sheetBatchId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25">
          <button type="button" aria-label="Close sheet" onClick={closeBatchSheet} className="absolute inset-0 cursor-default" />
          <div className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Delivery Sheet</h2>
                <p className="text-sm text-slate-600">Batch detail and order breakdown.</p>
              </div>
              <button
                type="button"
                onClick={closeBatchSheet}
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
                {/* Batch info */}
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Batch Info</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Route</p>
                      <p className="text-sm font-medium text-slate-900">{sheet.route.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Status</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL[sheet.batch.status] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {sheet.batch.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Delivery Date</p>
                      <p className="text-sm font-medium text-slate-900">{formatDate(sheet.batch.delivery_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Created</p>
                      <p className="text-sm font-medium text-slate-900">{formatDateTime(sheet.batch.created_at)}</p>
                    </div>
                    {sheet.route.description && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-slate-500">Route Description</p>
                        <p className="text-sm font-medium text-slate-900">{sheet.route.description}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Dispatch action */}
                {sheet.batch.status === "PENDING" && (
                  <button
                    type="button"
                    disabled={dispatching}
                    onClick={() => void handleDispatchBatch(sheet.batch.id)}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {dispatching ? "Dispatching…" : "Mark as Dispatched"}
                  </button>
                )}

                {/* Batch total */}
                {sheet.retailers.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Batch Total</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {formatCurrency(sheet.retailers.reduce((s, r) => s + r.totals.total_value, 0))}
                    </p>
                    <p className="text-xs text-slate-500">
                      {sheet.retailers.reduce((s, r) => s + r.totals.order_count, 0)} orders across{" "}
                      {sheet.retailers.length} retailers
                    </p>
                  </div>
                )}

                {/* Retailers + orders */}
                {sheet.retailers.map((retailerGroup) => (
                  <section key={retailerGroup.retailer.id} className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            {retailerGroup.sequence_no}. {retailerGroup.retailer.name}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {[
                              retailerGroup.retailer.phone,
                              retailerGroup.retailer.address_line1,
                              retailerGroup.retailer.locality,
                              retailerGroup.retailer.city,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(retailerGroup.totals.total_value)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {retailerGroup.totals.order_count} order{retailerGroup.totals.order_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {retailerGroup.orders.map((order) => (
                        <div key={order.id} className="px-4 py-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-slate-900">{order.order_number}</span>
                              <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[order.status] ?? "bg-slate-100 text-slate-700"}`}>
                                {order.status}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-slate-900">{formatCurrency(order.total_amount)}</span>
                          </div>
                          <table className="w-full text-xs">
                            <thead className="text-slate-500">
                              <tr>
                                <th className="pb-1 text-left font-medium">Product</th>
                                <th className="pb-1 text-left font-medium">Brand</th>
                                <th className="pb-1 text-right font-medium">Qty</th>
                                <th className="pb-1 text-right font-medium">Price</th>
                                <th className="pb-1 text-right font-medium">Total</th>
                              </tr>
                            </thead>
                            <tbody className="text-slate-700">
                              {order.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="py-0.5">{item.product_name}</td>
                                  <td className="py-0.5">{item.brand_name || "—"}</td>
                                  <td className="py-0.5 text-right">{item.quantity}</td>
                                  <td className="py-0.5 text-right">{formatCurrency(item.price)}</td>
                                  <td className="py-0.5 text-right">{formatCurrency(item.total_price)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Edit Route Retailers Modal
         ═══════════════════════════════════════════════════════════════ */}
      {editRouteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Edit Route Retailers</h2>
              <button
                type="button"
                onClick={() => setEditRouteId(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <form onSubmit={(e) => void submitEditRouteRetailers(e)} className="flex flex-col gap-4 px-6 py-5">
              {editError && <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{editError}</div>}
              {editSuccess && (
                <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">
                  Retailers updated!
                </div>
              )}

              <div>
                <p className="mb-1 text-sm text-slate-600">
                  Select retailers to assign to this route. This <strong>replaces</strong> all current assignments.
                </p>
                <input
                  value={editRetailerSearch}
                  onChange={(e) => setEditRetailerSearch(e.target.value)}
                  placeholder="Search retailers…"
                  className="mb-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                />
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {filteredEditRetailers.length === 0 ? (
                    <p className="px-2 py-1 text-sm text-slate-500">No retailers found.</p>
                  ) : (
                    filteredEditRetailers.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100">
                        <input
                          type="checkbox"
                          checked={editRetailerIds.includes(r.id)}
                          onChange={() => toggleRetailer(r.id, editRetailerIds, setEditRetailerIds)}
                          className="accent-slate-900"
                        />
                        <span className="text-slate-900">{r.name}</span>
                        <span className="text-xs text-slate-500">{r.phone}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">{editRetailerIds.length} selected</p>
              </div>

              <button
                type="submit"
                disabled={editSubmitting || editSuccess || editRetailerIds.length === 0}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editSubmitting ? "Saving…" : "Save Retailers"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
