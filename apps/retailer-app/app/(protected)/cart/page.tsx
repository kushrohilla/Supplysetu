"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useCart } from "@/components/cart/CartProvider";
import { getApiErrorMessage } from "@/services/auth.service";
import { orderService } from "@/services/order.service";

export default function CartPage() {
  const router = useRouter();
  const { items, totalAmount, updateQuantity, removeItem, clearCart } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Cart</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Review and place your order</h1>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Your cart is empty.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{item.brandName}</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">{item.productName}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.packSize}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="text-sm font-medium text-rose-700"
                >
                  Remove
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                >
                  -
                </button>
                <span className="min-w-8 text-center text-sm font-medium text-slate-900">{item.quantity}</span>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                >
                  +
                </button>
                <span className="ml-auto text-sm font-semibold text-slate-900">
                  Rs. {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Total</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">Rs. {totalAmount.toFixed(2)}</p>

            {error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</p> : null}

            <button
              type="button"
              disabled={submitting}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:bg-slate-400"
              onClick={async () => {
                setSubmitting(true);
                setError(null);

                try {
                  const order = await orderService.placeOrder(
                    items.map((item) => ({
                      product_id: item.productId,
                      quantity: item.quantity,
                    })),
                  );
                  clearCart();
                  router.push(`/orders/${order.id}?created=1`);
                } catch (submissionError) {
                  setError(getApiErrorMessage(submissionError, "Unable to place order."));
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
