import { BaseRepository } from "../../shared/base-repository";

type ProductRow = {
  base_price?: number | string;
  advance_price?: number | string | null;
};

export class PricingRepository extends BaseRepository {
  resolveUnitPrice(product: ProductRow | undefined, paymentMode: "advance" | "cod") {
    const basePrice = Number(product?.base_price ?? 0);
    const advancePrice = Number(product?.advance_price ?? basePrice);
    return paymentMode === "advance" ? advancePrice : basePrice;
  }
}
