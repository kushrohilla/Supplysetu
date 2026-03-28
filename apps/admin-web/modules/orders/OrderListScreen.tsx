"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { clearAuthSession, getApiErrorMessage } from "@/services/auth.service";
import { ApiError } from "@/services/api.service";
import { orderService } from "@/services/order.service";
import type { Order } from "@/types/order";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export function OrderListScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await orderService.fetchOrders();
        setOrders(data);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearAuthSession();
          router.push("/login");
          return;
        }

        setError(getApiErrorMessage(loadError, "Unable to load orders."));
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, [router]);

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-600">Review real tenant orders placed for your retailers.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/review-orders/new")}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Create Order
        </button>
      </div>

      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon="!"
            title="No orders yet"
            helper="Orders created through the backend will appear here."
            ctaLabel="Create Order"
            onCtaPress={() => router.push("/review-orders/new")}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">Order</th>
                <th className="border-b border-slate-200 px-4 py-3">Retailer</th>
                <th className="border-b border-slate-200 px-4 py-3">Status</th>
                <th className="border-b border-slate-200 px-4 py-3">Items</th>
                <th className="border-b border-slate-200 px-4 py-3">Total</th>
                <th className="border-b border-slate-200 px-4 py-3">Created</th>
                <th className="border-b border-slate-200 px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{order.order_number}</td>
                  <td className="px-4 py-3 text-slate-700">{order.retailer_name}</td>
                  <td className="px-4 py-3 text-slate-700">{order.status}</td>
                  <td className="px-4 py-3 text-slate-700">{order.items_count ?? order.items?.length ?? 0}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/review-orders/${order.id}`)}
                      className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
