import type { Knex } from "knex";

const createDeliveryRoutesTable = async (knex: Knex) => {
  const hasTable = await knex.schema.hasTable("delivery_routes");
  if (hasTable) {
    return;
  }

  await knex.schema.createTable("delivery_routes", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.string("name", 160).notNullable();
    table.text("description").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id", "created_at"], "idx_delivery_routes_tenant_created_at");
  });
};

const createDeliveryRouteRetailersTable = async (knex: Knex) => {
  const hasTable = await knex.schema.hasTable("delivery_route_retailers");
  if (hasTable) {
    return;
  }

  await knex.schema.createTable("delivery_route_retailers", (table) => {
    table.uuid("id").primary();
    table.uuid("delivery_route_id").notNullable().references("id").inTable("delivery_routes").onDelete("CASCADE");
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("retailer_id").notNullable().references("id").inTable("retailers").onDelete("CASCADE");
    table.integer("sequence_no").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["delivery_route_id", "retailer_id"], {
      indexName: "uq_delivery_route_retailers_route_retailer",
    });
    table.unique(["delivery_route_id", "sequence_no"], {
      indexName: "uq_delivery_route_retailers_route_sequence",
    });
    table.index(["tenant_id", "retailer_id"], "idx_delivery_route_retailers_tenant_retailer");
  });
};

const addDeliveryRouteIdToDispatchRoutes = async (knex: Knex) => {
  const hasDispatchRoutes = await knex.schema.hasTable("dispatch_routes");
  if (!hasDispatchRoutes) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn("dispatch_routes", "delivery_route_id");
  if (hasColumn) {
    return;
  }

  await knex.schema.alterTable("dispatch_routes", (table) => {
    table.uuid("delivery_route_id").nullable().references("id").inTable("delivery_routes").onDelete("SET NULL");
  });
};

const createDispatchBatchOrdersTable = async (knex: Knex) => {
  const hasTable = await knex.schema.hasTable("dispatch_batch_orders");
  if (hasTable) {
    return;
  }

  await knex.schema.createTable("dispatch_batch_orders", (table) => {
    table.uuid("id").primary();
    table.uuid("dispatch_route_id").notNullable().references("id").inTable("dispatch_routes").onDelete("CASCADE");
    table.uuid("route_stop_id").nullable().references("id").inTable("dispatch_route_stops").onDelete("SET NULL");
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("retailer_id").notNullable().references("id").inTable("retailers").onDelete("CASCADE");
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["order_id"], {
      indexName: "uq_dispatch_batch_orders_order_id",
    });
    table.unique(["dispatch_route_id", "order_id"], {
      indexName: "uq_dispatch_batch_orders_batch_order",
    });
    table.index(["tenant_id", "dispatch_route_id"], "idx_dispatch_batch_orders_tenant_batch");
    table.index(["tenant_id", "retailer_id"], "idx_dispatch_batch_orders_tenant_retailer");
  });
};

export async function up(knex: Knex): Promise<void> {
  await createDeliveryRoutesTable(knex);
  await createDeliveryRouteRetailersTable(knex);
  await addDeliveryRouteIdToDispatchRoutes(knex);
  await createDispatchBatchOrdersTable(knex);
}

export async function down(knex: Knex): Promise<void> {
  const hasDispatchBatchOrders = await knex.schema.hasTable("dispatch_batch_orders");
  if (hasDispatchBatchOrders) {
    await knex.schema.dropTableIfExists("dispatch_batch_orders");
  }

  const hasDispatchRoutes = await knex.schema.hasTable("dispatch_routes");
  const hasDeliveryRouteId = hasDispatchRoutes ? await knex.schema.hasColumn("dispatch_routes", "delivery_route_id") : false;
  if (hasDeliveryRouteId) {
    await knex.schema.alterTable("dispatch_routes", (table) => {
      table.dropColumn("delivery_route_id");
    });
  }

  const hasDeliveryRouteRetailers = await knex.schema.hasTable("delivery_route_retailers");
  if (hasDeliveryRouteRetailers) {
    await knex.schema.dropTableIfExists("delivery_route_retailers");
  }

  const hasDeliveryRoutes = await knex.schema.hasTable("delivery_routes");
  if (hasDeliveryRoutes) {
    await knex.schema.dropTableIfExists("delivery_routes");
  }
}
