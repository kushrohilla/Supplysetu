"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { clearAuthSession, getApiErrorMessage } from "@/services/auth.service";
import { ApiError } from "@/services/api.service";
import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types/order";

import { getAllowedNextStatuses } from "./order-status";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export function OrderDetailScreen({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await orderService.fetchOrder(orderId);
        setOrder(data);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearAuthSession();
          router.push("/login");
          return;
        }

        setError(getApiErrorMessage(loadError, "Unable to load order details."));
      } finally {
        setLoading(false);
      }
    };

    void loadOrder();
  }, [orderId, router]);

  const nextStatuses = useMemo(
    () => (order ? getAllowedNextStatuses(order.status) : []),
    [order],
  );

  const handleStatusUpdate = async (status: OrderStatus) => {
    setSavingStatus(status);
    setError(null);

    try {
      const updated = await orderService.updateOrderStatus(orderId, status);
      setOrder(updated);
      router.refresh();
    } catch (updateError) {
      if (updateError instanceof ApiError && updateError.status === 401) {
        clearAuthSession();
        router.push("/login");
        return;
      }

      setError(getApiErrorMessage(updateError, "Unable to update order status."));
    } finally {
      setSavingStatus(null);
    }
  };

  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading order...</div>;
  }

  if (!order) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
        <EmptyState icon="!" title="Order not found" helper="This order is not available for your tenant." />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{order.order_number}</h1>
          <p className="text-sm text-slate-600">Retailer: {order.retailer_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/review-orders")}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Back to Orders
          </button>
          <button
            type="button"
            onClick={() => router.push("/review-orders/new")}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Create Another
          </button>
        </div>
      </div>

      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{order.status}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Amount</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(order.total_amount)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Created</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Status Actions</h2>
        {nextStatuses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No further status transitions are available for this order.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => void handleStatusUpdate(status)}
                disabled={savingStatus !== null}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                {savingStatus === status ? "Updating..." : `Mark ${status}`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Order Items</h2>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3">Product</th>
              <th className="border-b border-slate-200 px-4 py-3">Brand</th>
              <th className="border-b border-slate-200 px-4 py-3">Quantity</th>
              <th className="border-b border-slate-200 px-4 py-3">Price</th>
              <th className="border-b border-slate-200 px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                <td className="px-4 py-3 text-slate-800">{item.product_name}</td>
                <td className="px-4 py-3 text-slate-700">{item.brand_name ?? "Unbranded"}</td>
                <td className="px-4 py-3 text-slate-700">{item.quantity}</td>
                <td className="px-4 py-3 text-slate-700">{formatCurrency(item.price)}</td>
                <td className="px-4 py-3 text-slate-700">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
