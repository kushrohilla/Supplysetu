import type { PricingRepository } from "./module.repository";

export class PricingService {
  constructor(private readonly pricingRepository: PricingRepository) {}

  resolveUnitPrice(product: { base_price?: number | string; advance_price?: number | string | null }, paymentMode: "advance" | "cod") {
    return this.pricingRepository.resolveUnitPrice(product, paymentMode);
  }
}
