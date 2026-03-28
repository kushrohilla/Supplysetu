import type { CartItem as CartItemType } from "@/types/cart";

type CartItemProps = {
  item: CartItemType;
  onRemove: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
};

export function CartItem({ item, onRemove, onUpdateQuantity }: CartItemProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{item.name}</h2>
          <p className="mt-1 text-sm text-slate-600">Rs. {item.price.toFixed(2)} each</p>
        </div>
        <button type="button" onClick={() => onRemove(item.product_id)} className="text-sm font-medium text-rose-700">
          Remove
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
          onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
        >
          -
        </button>
        <span className="min-w-8 text-center text-sm font-medium text-slate-900">{item.quantity}</span>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
          onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
        >
          +
        </button>
        <span className="ml-auto text-sm font-semibold text-slate-900">
          Rs. {(item.price * item.quantity).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
