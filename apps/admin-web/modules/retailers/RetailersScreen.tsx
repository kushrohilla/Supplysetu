"use client";

import { FormEvent, useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { clearAuthSession, getApiErrorMessage } from "@/services/auth.service";
import { ApiError } from "@/services/api.service";
import { retailerService } from "@/services/retailer.service";
import type { AdminRetailerDetail, AdminRetailerListResponse } from "@/types/retailer";

const PAGE_SIZE = 10;

const formatDate = (value: string | null) => {
  if (!value) {
    return "No orders yet";
  }

  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const formatCurrencyFromPaise = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);

const defaultListResponse: AdminRetailerListResponse = {
  items: [],
  pagination: {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    total_pages: 0,
  },
};

export function RetailersScreen() {
  const router = useRouter();
  const [retailers, setRetailers] = useState<AdminRetailerListResponse>(defaultListResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string | null>(null);
  const [selectedRetailer, setSelectedRetailer] = useState<AdminRetailerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const loadRetailers = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await retailerService.fetchAdminRetailers({
          search,
          page,
          limit: PAGE_SIZE,
        });
        setRetailers(data);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearAuthSession();
          router.push("/login");
          return;
        }

        setError(getApiErrorMessage(loadError, "Unable to load retailers."));
      } finally {
        setLoading(false);
      }
    };

    void loadRetailers();
  }, [page, router, search]);

  const openRetailerDetail = async (retailerId: string) => {
    setSelectedRetailerId(retailerId);
    setSelectedRetailer(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const detail = await retailerService.fetchAdminRetailerDetail(retailerId);
      setSelectedRetailer(detail);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        clearAuthSession();
        router.push("/login");
        return;
      }

      setDetailError(getApiErrorMessage(loadError, "Unable to load retailer details."));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeRetailerDetail = () => {
    setSelectedRetailerId(null);
    setSelectedRetailer(null);
    setDetailError(null);
  };

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(() => {
      setPage(1);
      setSearch(searchInput.trim());
    });
  };

  const hasResults = retailers.items.length > 0;
  const isSearchActive = search.length > 0;

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Retailers</h1>
          <p className="text-sm text-slate-600">
            Review linked retailers, recent activity, and order value without leaving the admin console.
          </p>
        </div>

        <form onSubmit={onSearchSubmit} className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by retailer name or phone"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Search
          </button>
        </form>
      </div>

      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading retailers...</div>
      ) : !hasResults ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon="R"
            title={isSearchActive ? "No retailers match your search" : "No linked retailers yet"}
            helper={
              isSearchActive
                ? "Try a different retailer name or phone number."
                : "Retailers linked to this distributor tenant will appear here with their recent order activity."
            }
            ctaLabel={isSearchActive ? "Clear search" : undefined}
            onCtaPress={isSearchActive ? () => startTransition(() => {
              setSearchInput("");
              setSearch("");
              setPage(1);
            }) : undefined}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Retailer Name</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Phone</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Linked Date</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Last Order</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Total Orders</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Total Value</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {retailers.items.map((retailer) => (
                  <tr key={retailer.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{retailer.name}</td>
                    <td className="px-4 py-3 text-slate-700">{retailer.phone}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(retailer.linked_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(retailer.last_order_date)}</td>
                    <td className="px-4 py-3 text-slate-700">{retailer.total_orders}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrencyFromPaise(retailer.total_value)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void openRetailerDetail(retailer.id)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {retailers.pagination.total_pages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
              <p>
                Page {retailers.pagination.page} of {retailers.pagination.total_pages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((currentPage) => Math.min(retailers.pagination.total_pages, currentPage + 1))}
                  disabled={page >= retailers.pagination.total_pages}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {selectedRetailerId ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25">
          <button
            type="button"
            aria-label="Close retailer details"
            onClick={closeRetailerDetail}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Retailer details</h2>
                <p className="text-sm text-slate-600">Profile, recent orders, and order summary for this linked retailer.</p>
              </div>
              <button
                type="button"
                onClick={closeRetailerDetail}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <div className="p-6 text-sm text-slate-500">Loading retailer details...</div>
            ) : detailError ? (
              <div className="p-6">
                <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{detailError}</div>
              </div>
            ) : selectedRetailer ? (
              <div className="flex flex-col gap-6 p-6">
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Profile</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Retailer name</p>
                      <p className="text-sm font-medium text-slate-900">{selectedRetailer.retailer.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="text-sm font-medium text-slate-900">{selectedRetailer.retailer.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Owner</p>
                      <p className="text-sm font-medium text-slate-900">{selectedRetailer.retailer.owner_name || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">GST</p>
                      <p className="text-sm font-medium text-slate-900">{selectedRetailer.retailer.gst_number || "Not provided"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-500">Address</p>
                      <p className="text-sm font-medium text-slate-900">
                        {[
                          selectedRetailer.retailer.address_line1,
                          selectedRetailer.retailer.locality,
                          selectedRetailer.retailer.city,
                          selectedRetailer.retailer.state,
                          selectedRetailer.retailer.pincode,
                        ].filter(Boolean).join(", ") || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Linked date</p>
                      <p className="text-sm font-medium text-slate-900">{formatDateTime(selectedRetailer.retailer.linked_at)}</p>
                    </div>
                  </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Total orders</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedRetailer.summary.total_orders}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Total value</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatCurrencyFromPaise(selectedRetailer.summary.total_value)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Last order</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatDate(selectedRetailer.summary.last_order_date)}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">Recent orders</h3>
                  </div>
                  {selectedRetailer.recent_orders.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-500">This retailer has not placed any tenant orders yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {selectedRetailer.recent_orders.map((order) => (
                        <div key={order.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[1.1fr_0.9fr_0.9fr] sm:items-center">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{order.order_number}</p>
                            <p className="text-xs text-slate-500">{formatDateTime(order.created_at)}</p>
                          </div>
                          <div className="text-sm text-slate-700">{order.status}</div>
                          <div className="text-sm font-medium text-slate-900">
                            {formatCurrencyFromPaise(order.total_amount_paise)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
