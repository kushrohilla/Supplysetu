import crypto from "crypto";

import knex, { type Knex } from "knex";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createKnexConfig } from "../../../../../packages/database";
import { up as completeOrderLifecyclePhaseOne } from "../../../../../packages/database/migrations/202603300001_complete_order_lifecycle_phase_1a";
import { up as addPaymentsFoundation } from "../../../../../packages/database/migrations/202603300003_add_payments_foundation";
import { up as standardizeGlobalRetailerIdentity } from "../../../../../packages/database/migrations/202603280004_standardize_global_retailer_identity";
import { loadEnv } from "../../../../../packages/utils/src/env";
import { ReportingRepository } from "./module.repository";
import { ReportingService } from "./module.service";

const buildDb = () => {
  const env = loadEnv();

  return knex(createKnexConfig({
    ...env,
    NODE_ENV: "test",
  }));
};

const ensureDispatchReportingTables = async (db: Knex) => {
  const hasDispatchRoutes = await db.schema.hasTable("dispatch_routes");
  if (!hasDispatchRoutes) {
    await db.schema.createTable("dispatch_routes", (table) => {
      table.uuid("id").primary();
      table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
      table.date("planned_date").notNullable();
      table.string("status", 32).notNullable().defaultTo("planning");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    });
  }

  const hasDispatchRouteStops = await db.schema.hasTable("dispatch_route_stops");
  if (!hasDispatchRouteStops) {
    await db.schema.createTable("dispatch_route_stops", (table) => {
      table.uuid("id").primary();
      table.uuid("dispatch_route_id").notNullable().references("id").inTable("dispatch_routes").onDelete("CASCADE");
      table.uuid("retailer_id").notNullable().references("id").inTable("retailers").onDelete("RESTRICT");
      table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
      table.integer("sequence_no").notNullable().defaultTo(1);
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    });
  }

  const hasDeliveryRoutes = await db.schema.hasTable("delivery_routes");
  if (!hasDeliveryRoutes) {
    await db.schema.createTable("delivery_routes", (table) => {
      table.uuid("id").primary();
      table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
      table.string("name", 160).notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    });
  }

  const hasDeliveryRouteId = await db.schema.hasColumn("dispatch_routes", "delivery_route_id");
  if (!hasDeliveryRouteId) {
    await db.schema.alterTable("dispatch_routes", (table) => {
      table.uuid("delivery_route_id").nullable().references("id").inTable("delivery_routes").onDelete("SET NULL");
    });
  }

  const hasDispatchBatchOrders = await db.schema.hasTable("dispatch_batch_orders");
  if (!hasDispatchBatchOrders) {
    await db.schema.createTable("dispatch_batch_orders", (table) => {
      table.uuid("id").primary();
      table.uuid("dispatch_route_id").notNullable().references("id").inTable("dispatch_routes").onDelete("CASCADE");
      table.uuid("route_stop_id").nullable().references("id").inTable("dispatch_route_stops").onDelete("SET NULL");
      table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
      table.uuid("retailer_id").notNullable().references("id").inTable("retailers").onDelete("CASCADE");
      table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    });
  }
};

const ensureReportingSchema = async (db: Knex) => {
  const hasOrderNumber = await db.schema.hasColumn("orders", "order_number");
  if (!hasOrderNumber) {
    await standardizeGlobalRetailerIdentity(db);
  }

  await completeOrderLifecyclePhaseOne(db);
  await addPaymentsFoundation(db);
  await ensureDispatchReportingTables(db);
};

const insertTenant = async (trx: Knex.Transaction, input: {
  id: string;
  code: string;
  name: string;
}) => {
  await trx("tenants").insert({
    id: input.id,
    code: input.code,
    name: input.name,
    is_active: true,
  });
};

const insertRetailer = async (trx: Knex.Transaction, input: {
  id: string;
  name: string;
  phone: string;
}) => {
  await trx("retailers").insert({
    id: input.id,
    name: input.name,
    phone: input.phone,
    is_active: true,
  });
};

const insertRetailerLink = async (trx: Knex.Transaction, input: {
  id: string;
  tenantId: string;
  retailerId: string;
  createdAt: string;
}) => {
  await trx("retailer_distributor_links").insert({
    id: input.id,
    tenant_id: input.tenantId,
    retailer_id: input.retailerId,
    created_at: input.createdAt,
  });
};

const insertProduct = async (trx: Knex.Transaction, input: {
  id: string;
  tenantId: string;
  productName: string;
  skuCode: string;
  basePrice: number;
}) => {
  await trx("tenant_products").insert({
    id: input.id,
    tenant_id: input.tenantId,
    product_name: input.productName,
    pack_size: "Case",
    sku_code: input.skuCode,
    base_price: input.basePrice,
    status: "active",
    performance_band: "active",
  });
};

const insertOrder = async (trx: Knex.Transaction, input: {
  id: string;
  tenantId: string;
  retailerId: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  paymentMode: "advance" | "cod" | "credit";
  createdAt: string;
  deliveredAt?: string | null;
}) => {
  await trx("orders").insert({
    id: input.id,
    tenant_id: input.tenantId,
    retailer_id: input.retailerId,
    order_number: input.orderNumber,
    status: input.status,
    total_amount: input.totalAmount,
    payment_mode: input.paymentMode,
    created_at: input.createdAt,
    updated_at: input.createdAt,
    delivered_at: input.deliveredAt ?? null,
  });
};

const insertOrderItem = async (trx: Knex.Transaction, input: {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  totalPrice: number;
}) => {
  await trx("order_items").insert({
    id: input.id,
    order_id: input.orderId,
    product_id: input.productId,
    quantity: input.quantity,
    price: input.price,
    total_price: input.totalPrice,
  });
};

const insertPayment = async (trx: Knex.Transaction, input: {
  id: string;
  tenantId: string;
  retailerId: string;
  orderId: string;
  amountPaise: number;
  paymentMode: "advance" | "cod" | "credit";
  paidAt: string;
}) => {
  await trx("payment_transactions").insert({
    id: input.id,
    tenant_id: input.tenantId,
    retailer_id: input.retailerId,
    order_id: input.orderId,
    amount_paise: input.amountPaise,
    payment_mode: input.paymentMode,
    paid_at: input.paidAt,
  });
};

const insertDeliveryRoute = async (trx: Knex.Transaction, input: {
  id: string;
  tenantId: string;
  name: string;
}) => {
  await trx("delivery_routes").insert({
    id: input.id,
    tenant_id: input.tenantId,
    name: input.name,
  });
};

const insertDispatchBatch = async (trx: Knex.Transaction, input: {
  id: string;
  tenantId: string;
  deliveryRouteId: string;
  plannedDate: string;
  status: "PENDING" | "DISPATCHED" | "COMPLETED";
}) => {
  await trx("dispatch_routes").insert({
    id: input.id,
    tenant_id: input.tenantId,
    delivery_route_id: input.deliveryRouteId,
    planned_date: input.plannedDate,
    status: input.status,
  });
};

const insertDispatchBatchOrder = async (trx: Knex.Transaction, input: {
  id: string;
  dispatchRouteId: string;
  tenantId: string;
  retailerId: string;
  orderId: string;
}) => {
  await trx("dispatch_batch_orders").insert({
    id: input.id,
    dispatch_route_id: input.dispatchRouteId,
    tenant_id: input.tenantId,
    retailer_id: input.retailerId,
    order_id: input.orderId,
  });
};

describe("ReportingRepository", () => {
  let db: Knex;

  beforeAll(async () => {
    db = buildDb();
    await ensureReportingSchema(db);
  }, 120000);

  afterAll(async () => {
    await db.destroy();
  });

  it("derives summary metrics, top products, and tenant isolation from operational data", async () => {
    const repository = new ReportingRepository(db);
    const trx = await db.transaction();

    try {
      const tenantA = crypto.randomUUID();
      const tenantB = crypto.randomUUID();
      const retailer1 = crypto.randomUUID();
      const retailer2 = crypto.randomUUID();
      const retailer3 = crypto.randomUUID();
      const otherRetailer = crypto.randomUUID();
      const product1 = crypto.randomUUID();
      const product2 = crypto.randomUUID();
      const otherProduct = crypto.randomUUID();

      await insertTenant(trx, { id: tenantA, code: `rpt-a-${Date.now()}`, name: "Tenant A" });
      await insertTenant(trx, { id: tenantB, code: `rpt-b-${Date.now()}`, name: "Tenant B" });

      await insertRetailer(trx, { id: retailer1, name: "Fresh Mart", phone: `930${Date.now().toString().slice(-7)}` });
      await insertRetailer(trx, { id: retailer2, name: "Metro Stores", phone: `931${Date.now().toString().slice(-7)}` });
      await insertRetailer(trx, { id: retailer3, name: "New Retailer", phone: `932${Date.now().toString().slice(-7)}` });
      await insertRetailer(trx, { id: otherRetailer, name: "Other Tenant Retailer", phone: `933${Date.now().toString().slice(-7)}` });

      await insertRetailerLink(trx, { id: crypto.randomUUID(), tenantId: tenantA, retailerId: retailer1, createdAt: "2026-02-15T00:00:00.000Z" });
      await insertRetailerLink(trx, { id: crypto.randomUUID(), tenantId: tenantA, retailerId: retailer2, createdAt: "2026-02-20T00:00:00.000Z" });
      await insertRetailerLink(trx, { id: crypto.randomUUID(), tenantId: tenantA, retailerId: retailer3, createdAt: "2026-03-12T00:00:00.000Z" });
      await insertRetailerLink(trx, { id: crypto.randomUUID(), tenantId: tenantB, retailerId: otherRetailer, createdAt: "2026-03-03T00:00:00.000Z" });

      await insertProduct(trx, { id: product1, tenantId: tenantA, productName: "Tea Pack", skuCode: `TEA-${Date.now()}`, basePrice: 50 });
      await insertProduct(trx, { id: product2, tenantId: tenantA, productName: "Soap Case", skuCode: `SOAP-${Date.now()}`, basePrice: 40 });
      await insertProduct(trx, { id: otherProduct, tenantId: tenantB, productName: "Other Product", skuCode: `OTH-${Date.now()}`, basePrice: 999 });

      const order1 = crypto.randomUUID();
      const order2 = crypto.randomUUID();
      const order3 = crypto.randomUUID();
      const order4 = crypto.randomUUID();
      const orderOther = crypto.randomUUID();

      await insertOrder(trx, {
        id: order1,
        tenantId: tenantA,
        retailerId: retailer1,
        orderNumber: "ORD-100001",
        status: "CONFIRMED",
        totalAmount: 100,
        paymentMode: "cod",
        createdAt: "2026-03-05T10:00:00.000Z",
      });
      await insertOrder(trx, {
        id: order2,
        tenantId: tenantA,
        retailerId: retailer1,
        orderNumber: "ORD-100002",
        status: "DELIVERED",
        totalAmount: 50,
        paymentMode: "advance",
        createdAt: "2026-03-10T10:00:00.000Z",
        deliveredAt: "2026-03-11T10:00:00.000Z",
      });
      await insertOrder(trx, {
        id: order3,
        tenantId: tenantA,
        retailerId: retailer2,
        orderNumber: "ORD-100003",
        status: "CANCELLED",
        totalAmount: 70,
        paymentMode: "cod",
        createdAt: "2026-03-15T10:00:00.000Z",
      });
      await insertOrder(trx, {
        id: order4,
        tenantId: tenantA,
        retailerId: retailer2,
        orderNumber: "ORD-100004",
        status: "PACKED",
        totalAmount: 80,
        paymentMode: "cod",
        createdAt: "2026-03-20T10:00:00.000Z",
      });
      await insertOrder(trx, {
        id: orderOther,
        tenantId: tenantB,
        retailerId: otherRetailer,
        orderNumber: "ORD-900001",
        status: "DELIVERED",
        totalAmount: 999,
        paymentMode: "advance",
        createdAt: "2026-03-08T10:00:00.000Z",
      });

      await insertOrderItem(trx, { id: crypto.randomUUID(), orderId: order1, productId: product1, quantity: 2, price: 30, totalPrice: 60 });
      await insertOrderItem(trx, { id: crypto.randomUUID(), orderId: order1, productId: product2, quantity: 1, price: 40, totalPrice: 40 });
      await insertOrderItem(trx, { id: crypto.randomUUID(), orderId: order2, productId: product1, quantity: 1, price: 50, totalPrice: 50 });
      await insertOrderItem(trx, { id: crypto.randomUUID(), orderId: order3, productId: product2, quantity: 7, price: 10, totalPrice: 70 });
      await insertOrderItem(trx, { id: crypto.randomUUID(), orderId: order4, productId: product2, quantity: 4, price: 20, totalPrice: 80 });
      await insertOrderItem(trx, { id: crypto.randomUUID(), orderId: orderOther, productId: otherProduct, quantity: 20, price: 49.95, totalPrice: 999 });

      await insertPayment(trx, {
        id: crypto.randomUUID(),
        tenantId: tenantA,
        retailerId: retailer1,
        orderId: order1,
        amountPaise: 3000,
        paymentMode: "cod",
        paidAt: "2026-03-06T09:00:00.000Z",
      });
      await insertPayment(trx, {
        id: crypto.randomUUID(),
        tenantId: tenantA,
        retailerId: retailer1,
        orderId: order2,
        amountPaise: 5000,
        paymentMode: "advance",
        paidAt: "2026-03-10T12:00:00.000Z",
      });
      await insertPayment(trx, {
        id: crypto.randomUUID(),
        tenantId: tenantB,
        retailerId: otherRetailer,
        orderId: orderOther,
        amountPaise: 99900,
        paymentMode: "advance",
        paidAt: "2026-03-09T12:00:00.000Z",
      });

      const service = new ReportingService({
        repository: {
          listIncludedOrders: (tenantId, range) => repository.listIncludedOrders(tenantId, range, trx),
          countNewRetailers: (tenantId, range) => repository.countNewRetailers(tenantId, range, trx),
          listPaymentsForOrders: (tenantId, orderIds, paidToIso) =>
            repository.listPaymentsForOrders(tenantId, orderIds, paidToIso, trx),
          sumAdvanceCollected: (tenantId, range) => repository.sumAdvanceCollected(tenantId, range, trx),
          listProductUnitsForOrders: (tenantId, orderIds) => repository.listProductUnitsForOrders(tenantId, orderIds, trx),
          listRoutePerformanceRows: (tenantId, range) => repository.listRoutePerformanceRows(tenantId, range, trx),
        },
      });

      const summary = await service.getSummary(tenantA, {
        from: "2026-03-01",
        to: "2026-03-31",
      });

      expect(summary.total_orders).toBe(3);
      expect(summary.total_gmv).toBe(23000);
      expect(summary.avg_order_value).toBe(7667);
      expect(summary.active_retailers).toBe(2);
      expect(summary.new_retailers).toBe(1);
      expect(summary.total_outstanding).toBe(15000);
      expect(summary.advance_collected).toBe(5000);
      expect(summary.cod_pending).toBe(15000);
      expect(summary.top_products).toEqual([
        { name: "Soap Case", units_sold: 5 },
        { name: "Tea Pack", units_sold: 3 },
      ]);
    } finally {
      await trx.rollback();
    }
  }, 20000);

  it("builds zero-filled trend buckets, sorts retailers, and calculates route performance", async () => {
    const repository = new ReportingRepository(db);
    const trx = await db.transaction();

    try {
      const tenantId = crypto.randomUUID();
      const retailer1 = crypto.randomUUID();
      const retailer2 = crypto.randomUUID();
      const product1 = crypto.randomUUID();
      const route1 = crypto.randomUUID();
      const route2 = crypto.randomUUID();
      const batch1 = crypto.randomUUID();
      const batch2 = crypto.randomUUID();
      const batch3 = crypto.randomUUID();
      const order1 = crypto.randomUUID();
      const order2 = crypto.randomUUID();
      const order3 = crypto.randomUUID();
      const order4 = crypto.randomUUID();

      await insertTenant(trx, { id: tenantId, code: `rpt-c-${Date.now()}`, name: "Trend Tenant" });
      await insertRetailer(trx, { id: retailer1, name: "Retailer Alpha", phone: `940${Date.now().toString().slice(-7)}` });
      await insertRetailer(trx, { id: retailer2, name: "Retailer Beta", phone: `941${Date.now().toString().slice(-7)}` });
      await insertRetailerLink(trx, { id: crypto.randomUUID(), tenantId, retailerId: retailer1, createdAt: "2026-02-01T00:00:00.000Z" });
      await insertRetailerLink(trx, { id: crypto.randomUUID(), tenantId, retailerId: retailer2, createdAt: "2026-02-01T00:00:00.000Z" });
      await insertProduct(trx, { id: product1, tenantId, productName: "Biscuits", skuCode: `BIS-${Date.now()}`, basePrice: 60 });

      await insertOrder(trx, {
        id: order1,
        tenantId,
        retailerId: retailer1,
        orderNumber: "ORD-200001",
        status: "DISPATCHED",
        totalAmount: 60,
        paymentMode: "cod",
        createdAt: "2026-03-05T10:00:00.000Z",
      });
      await insertOrder(trx, {
        id: order2,
        tenantId,
        retailerId: retailer1,
        orderNumber: "ORD-200002",
        status: "CLOSED",
        totalAmount: 90,
        paymentMode: "advance",
        createdAt: "2026-03-06T10:00:00.000Z",
        deliveredAt: "2026-03-07T10:00:00.000Z",
      });
      await insertOrder(trx, {
        id: order3,
        tenantId,
        retailerId: retailer2,
        orderNumber: "ORD-200003",
        status: "DELIVERED",
        totalAmount: 40,
        paymentMode: "cod",
        createdAt: "2026-03-08T10:00:00.000Z",
        deliveredAt: "2026-03-09T10:00:00.000Z",
      });
      await insertOrder(trx, {
        id: order4,
        tenantId,
        retailerId: retailer2,
        orderNumber: "ORD-200004",
        status: "PACKED",
        totalAmount: 80,
        paymentMode: "cod",
        createdAt: "2026-03-20T10:00:00.000Z",
      });

      await insertOrderItem(trx, { id: crypto.randomUUID(), orderId: order1, productId: product1, quantity: 1, price: 60, totalPrice: 60 });
      await insertOrderItem(trx, { id: crypto.randomUUID(), orderId: order2, productId: product1, quantity: 1, price: 90, totalPrice: 90 });
      await insertOrderItem(trx, { id: crypto.randomUUID(), orderId: order3, productId: product1, quantity: 1, price: 40, totalPrice: 40 });
      await insertOrderItem(trx, { id: crypto.randomUUID(), orderId: order4, productId: product1, quantity: 2, price: 40, totalPrice: 80 });

      await insertPayment(trx, {
        id: crypto.randomUUID(),
        tenantId,
        retailerId: retailer1,
        orderId: order2,
        amountPaise: 9000,
        paymentMode: "advance",
        paidAt: "2026-03-06T12:00:00.000Z",
      });
      await insertPayment(trx, {
        id: crypto.randomUUID(),
        tenantId,
        retailerId: retailer2,
        orderId: order3,
        amountPaise: 1000,
        paymentMode: "cod",
        paidAt: "2026-03-09T12:00:00.000Z",
      });

      await insertDeliveryRoute(trx, { id: route1, tenantId, name: "North Route" });
      await insertDeliveryRoute(trx, { id: route2, tenantId, name: "South Route" });
      await insertDispatchBatch(trx, { id: batch1, tenantId, deliveryRouteId: route1, plannedDate: "2026-03-18", status: "DISPATCHED" });
      await insertDispatchBatch(trx, { id: batch2, tenantId, deliveryRouteId: route1, plannedDate: "2026-03-22", status: "COMPLETED" });
      await insertDispatchBatch(trx, { id: batch3, tenantId, deliveryRouteId: route2, plannedDate: "2026-03-25", status: "PENDING" });
      await insertDispatchBatchOrder(trx, { id: crypto.randomUUID(), dispatchRouteId: batch1, tenantId, retailerId: retailer1, orderId: order1 });
      await insertDispatchBatchOrder(trx, { id: crypto.randomUUID(), dispatchRouteId: batch2, tenantId, retailerId: retailer1, orderId: order2 });
      await insertDispatchBatchOrder(trx, { id: crypto.randomUUID(), dispatchRouteId: batch2, tenantId, retailerId: retailer2, orderId: order3 });
      await insertDispatchBatchOrder(trx, { id: crypto.randomUUID(), dispatchRouteId: batch3, tenantId, retailerId: retailer2, orderId: order4 });

      const service = new ReportingService({
        repository: {
          listIncludedOrders: (valueTenantId, range) => repository.listIncludedOrders(valueTenantId, range, trx),
          countNewRetailers: (valueTenantId, range) => repository.countNewRetailers(valueTenantId, range, trx),
          listPaymentsForOrders: (valueTenantId, orderIds, paidToIso) =>
            repository.listPaymentsForOrders(valueTenantId, orderIds, paidToIso, trx),
          sumAdvanceCollected: (valueTenantId, range) => repository.sumAdvanceCollected(valueTenantId, range, trx),
          listProductUnitsForOrders: (valueTenantId, orderIds) =>
            repository.listProductUnitsForOrders(valueTenantId, orderIds, trx),
          listRoutePerformanceRows: (valueTenantId, range) => repository.listRoutePerformanceRows(valueTenantId, range, trx),
        },
      });

      const trend = await service.getOrdersTrend(tenantId, {
        from: "2026-03-05",
        to: "2026-03-07",
        period: "daily",
      });
      const retailers = await service.getRetailers(tenantId, {
        from: "2026-03-01",
        to: "2026-03-31",
        sort: "outstanding",
        direction: "desc",
        limit: 2,
      });
      const routes = await service.getRoutePerformance(tenantId, {
        from: "2026-03-01",
        to: "2026-03-31",
      });

      expect(trend).toEqual([
        { period_label: "2026-03-05", order_count: 1, gmv: 6000 },
        { period_label: "2026-03-06", order_count: 1, gmv: 9000 },
        { period_label: "2026-03-07", order_count: 0, gmv: 0 },
      ]);

      expect(retailers).toEqual([
        {
          retailer_id: retailer2,
          retailer_name: "Retailer Beta",
          total_orders: 2,
          total_value: 12000,
          outstanding: 11000,
          last_order_date: "2026-03-20T10:00:00.000Z",
        },
        {
          retailer_id: retailer1,
          retailer_name: "Retailer Alpha",
          total_orders: 2,
          total_value: 15000,
          outstanding: 6000,
          last_order_date: "2026-03-06T10:00:00.000Z",
        },
      ]);

      expect(routes).toEqual([
        {
          route_id: route1,
          route_name: "North Route",
          total_batches: 2,
          total_orders: 3,
          dispatched_orders: 3,
          delivered_orders: 2,
          delivery_rate: 0.6667,
          avg_orders_per_batch: 1.5,
        },
        {
          route_id: route2,
          route_name: "South Route",
          total_batches: 1,
          total_orders: 1,
          dispatched_orders: 0,
          delivered_orders: 0,
          delivery_rate: 0,
          avg_orders_per_batch: 1,
        },
      ]);
    } finally {
      await trx.rollback();
    }
  }, 20000);
});
