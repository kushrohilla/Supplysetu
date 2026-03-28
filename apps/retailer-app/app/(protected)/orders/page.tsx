"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/services/auth.service";
import { orderService } from "@/services/order.service";
import type { OrderSummary } from "@/types/order";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setError(null);
        const response = await orderService.listOrders();
        setOrders(response);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, "Unable to load orders."));
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Orders</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Track your recent orders</h1>
      </div>

      {loading ? <p className="text-sm text-slate-600">Loading orders...</p> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</p> : null}
      {!loading && !error && orders.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          No orders yet.
        </p>
      ) : null}

      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{order.order_number}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{order.status}</h2>
                <p className="mt-1 text-sm text-slate-600">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <p className="text-base font-semibold text-slate-900">Rs. {order.total_amount.toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
