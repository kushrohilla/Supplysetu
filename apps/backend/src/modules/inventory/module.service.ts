import type { InventoryRepository } from "./module.repository";

export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async getAvailableStock(tenantId: string, productIds: string[]) {
    return this.inventoryRepository.getAvailableStock(tenantId, productIds);
  }
}
