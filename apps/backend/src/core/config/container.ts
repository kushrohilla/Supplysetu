import type { Knex } from "knex";

import { AuthService } from "../../modules/auth/module.service";
import { RetailerRepository } from "../../modules/auth/module.repository";
import { CatalogRepository } from "../../modules/catalog/module.repository";
import { CatalogService } from "../../modules/catalog/module.service";
import { DistributorRepository } from "../../modules/distributor/module.repository";
import { DistributorService } from "../../modules/distributor/module.service";
import { InventoryRepository } from "../../modules/inventory/module.repository";
import { InventoryService } from "../../modules/inventory/module.service";
import { OrderRepository } from "../../modules/order/module.repository";
import { OrderService } from "../../modules/order/module.service";
import { PricingRepository } from "../../modules/pricing/module.repository";
import { PricingService } from "../../modules/pricing/module.service";
import { RetailerRepository as TenantRetailerRepository } from "../../modules/retailer/retailer.repository";
import { RetailerService } from "../../modules/retailer/retailer.service";
import { EventBus } from "../../shared/event-bus";

export interface AppContainer {
  db: Knex;
  eventBus: EventBus;
  authService: AuthService;
  distributorService: DistributorService;
  catalogService: CatalogService;
  orderService: OrderService;
  inventoryService: InventoryService;
  pricingService: PricingService;
  retailerService: RetailerService;
}

export const createContainer = (db: Knex): AppContainer => {
  const eventBus = new EventBus();
  const retailerRepository = new RetailerRepository(db);
  const tenantRetailerRepository = new TenantRetailerRepository(db);
  const distributorRepository = new DistributorRepository(db);
  const catalogRepository = new CatalogRepository(db);
  const inventoryRepository = new InventoryRepository(db);
  const pricingRepository = new PricingRepository(db);
  const orderRepository = new OrderRepository(db);

  return {
    db,
    eventBus,
    authService: new AuthService(db, retailerRepository, distributorRepository),
    distributorService: new DistributorService(distributorRepository),
    catalogService: new CatalogService(catalogRepository),
    orderService: new OrderService(db, orderRepository, inventoryRepository, pricingRepository, eventBus),
    inventoryService: new InventoryService(inventoryRepository),
    pricingService: new PricingService(pricingRepository),
    retailerService: new RetailerService(tenantRetailerRepository),
  };
};
