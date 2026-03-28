import type { Product } from "@/types/catalogue";

type ProductCardProps = {
  product: Product;
  onAdd: (product: Product) => void;
};

export function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{product.brandName}</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">{product.name}</h2>
      <p className="mt-1 text-sm text-slate-600">{product.packSize}</p>
      <p className="mt-4 text-base font-semibold text-slate-900">Rs. {product.basePrice.toFixed(2)}</p>
      <button
        type="button"
        onClick={() => onAdd(product)}
        className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Add to cart
      </button>
    </div>
  );
}
