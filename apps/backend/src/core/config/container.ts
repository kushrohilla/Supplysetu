import type { Knex } from "knex";

import { AuthService } from "../../modules/auth/module.service";
import { RetailerRepository } from "../../modules/auth/module.repository";
import { CatalogRepository } from "../../modules/catalog/module.repository";
import { CatalogService } from "../../modules/catalog/module.service";
import { DistributorRepository } from "../../modules/distributor/module.repository";
import { DistributorService } from "../../modules/distributor/module.service";
import { DispatchRepository } from "../../modules/dispatch/module.repository";
import { DispatchService } from "../../modules/dispatch/module.service";
import { InventoryRepository } from "../../modules/inventory/module.repository";
import { InventoryService } from "../../modules/inventory/module.service";
import { InviteRepository } from "../../modules/invite/invite.repository";
import { InviteService } from "../../modules/invite/invite.service";
import { OrderRepository } from "../../modules/order/module.repository";
import { OrderService } from "../../modules/order/module.service";
import { PaymentsRepository } from "../../modules/payments/module.repository";
import { PaymentsService } from "../../modules/payments/module.service";
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
  dispatchService: DispatchService;
  orderService: OrderService;
  inventoryService: InventoryService;
  paymentsService: PaymentsService;
  pricingService: PricingService;
  retailerService: RetailerService;
  inviteService: InviteService;
}

export const createContainer = (db: Knex): AppContainer => {
  const eventBus = new EventBus();
  const retailerRepository = new RetailerRepository(db);
  const tenantRetailerRepository = new TenantRetailerRepository(db);
  const distributorRepository = new DistributorRepository(db);
  const dispatchRepository = new DispatchRepository(db);
  const inviteRepository = new InviteRepository(db);
  const catalogRepository = new CatalogRepository(db);
  const inventoryRepository = new InventoryRepository(db);
  const paymentsRepository = new PaymentsRepository(db);
  const pricingRepository = new PricingRepository(db);
  const orderRepository = new OrderRepository(db);

  return {
    db,
    eventBus,
    authService: new AuthService(db, retailerRepository, distributorRepository),
    distributorService: new DistributorService(distributorRepository),
    catalogService: new CatalogService(catalogRepository),
    dispatchService: new DispatchService(db, dispatchRepository, orderRepository),
    orderService: new OrderService(db, orderRepository),
    inventoryService: new InventoryService(db, inventoryRepository),
    paymentsService: new PaymentsService(db, paymentsRepository),
    pricingService: new PricingService(pricingRepository),
    retailerService: new RetailerService(tenantRetailerRepository),
    inviteService: new InviteService(db, inviteRepository),
  };
};
