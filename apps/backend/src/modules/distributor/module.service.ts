import type { DistributorRepository } from "./module.repository";

export class DistributorService {
  constructor(private readonly distributorRepository: DistributorRepository) {}

  async listDistributors(retailerId: string) {
    return this.distributorRepository.listDistributors(retailerId);
  }

  async getRetailerHome(retailerId: string, tenantId: string) {
    return this.distributorRepository.getRetailerHome(retailerId, tenantId);
  }
}
