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
import { NotificationsRepository } from "../../modules/notifications/module.repository";
import { NotificationsService } from "../../modules/notifications/module.service";
import { createSmsProvider } from "../../modules/notifications/providers/sms-provider";
import { createWhatsAppProvider } from "../../modules/notifications/providers/whatsapp-provider";
import { OrderRepository } from "../../modules/order/module.repository";
import { OrderService } from "../../modules/order/module.service";
import { PaymentsRepository } from "../../modules/payments/module.repository";
import { PaymentsService } from "../../modules/payments/module.service";
import { PricingRepository } from "../../modules/pricing/module.repository";
import { PricingService } from "../../modules/pricing/module.service";
import { ReportingRepository } from "../../modules/reporting/module.repository";
import { ReportingService } from "../../modules/reporting/module.service";
import { RetailerRepository as TenantRetailerRepository } from "../../modules/retailer/retailer.repository";
import { RetailerService } from "../../modules/retailer/retailer.service";
import { EventBus } from "../../shared/event-bus";
import { env, logger } from ".";

export interface AppContainer {
  db: Knex;
  eventBus: EventBus;
  authService: AuthService;
  distributorService: DistributorService;
  catalogService: CatalogService;
  dispatchService: DispatchService;
  orderService: OrderService;
  inventoryService: InventoryService;
  notificationsService: NotificationsService;
  paymentsService: PaymentsService;
  pricingService: PricingService;
  reportingService: ReportingService;
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
  const notificationsRepository = new NotificationsRepository(db);
  const paymentsRepository = new PaymentsRepository(db);
  const pricingRepository = new PricingRepository(db);
  const orderRepository = new OrderRepository(db);
  const reportingRepository = new ReportingRepository(db);
  const notificationsService = new NotificationsService({
    repository: notificationsRepository,
    smsProvider: createSmsProvider({
      provider: env.NOTIFICATIONS_SMS_PROVIDER,
      senderId: env.NOTIFICATIONS_SMS_SENDER_ID,
      apiKey: env.NOTIFICATIONS_SMS_API_KEY,
    }, logger),
    whatsappProvider: createWhatsAppProvider({
      provider: env.NOTIFICATIONS_WHATSAPP_PROVIDER,
      senderId: env.NOTIFICATIONS_WHATSAPP_SENDER_ID,
      apiKey: env.NOTIFICATIONS_WHATSAPP_API_KEY,
    }, logger),
    logger,
    inactivityDays: env.NOTIFICATIONS_INACTIVITY_DAYS,
    inactivityCooldownHours: env.NOTIFICATIONS_INACTIVITY_COOLDOWN_HOURS,
  });

  return {
    db,
    eventBus,
    authService: new AuthService(db, retailerRepository, distributorRepository),
    distributorService: new DistributorService(distributorRepository),
    catalogService: new CatalogService(catalogRepository),
    dispatchService: new DispatchService(db, dispatchRepository, orderRepository, notificationsService),
    orderService: new OrderService(db, orderRepository, notificationsService),
    inventoryService: new InventoryService(db, inventoryRepository),
    notificationsService,
    paymentsService: new PaymentsService(db, paymentsRepository, notificationsService),
    pricingService: new PricingService(pricingRepository),
    reportingService: new ReportingService({ repository: reportingRepository }),
    retailerService: new RetailerService(tenantRetailerRepository),
    inviteService: new InviteService(db, inviteRepository),
  };
};
