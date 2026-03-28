"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { getApiErrorMessage } from "@/services/auth.service";
import { orderService } from "@/services/order.service";
import type { OrderDetail } from "@/types/order";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setError(null);
        const response = await orderService.getOrder(params.id);
        setOrder(response);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, "Unable to load this order."));
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      void loadOrder();
    }
  }, [params.id]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Order Detail</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{order?.order_number ?? "Order"}</h1>
      </div>

      {searchParams.get("created") === "1" ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700">Order placed successfully.</p>
      ) : null}
      {loading ? <p className="text-sm text-slate-600">Loading order...</p> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</p> : null}

      {order ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Status</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{order.status}</p>
            <p className="mt-4 text-sm text-slate-600">Total</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">Rs. {order.total_amount.toFixed(2)}</p>
          </div>

          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  {item.brand_name ?? "Product"}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">{item.product_name}</h2>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>Qty {item.quantity}</span>
                  <span>Rs. {item.total_price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
