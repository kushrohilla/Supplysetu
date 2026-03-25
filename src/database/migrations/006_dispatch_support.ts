import type { Knex } from "knex";

/**
 * 006_DISPATCH_SUPPORT
 *
 * Domain: Logistics & Last-Mile Fulfillment
 *
 * Supports route optimization, vehicle tracking, and proof-of-delivery.
 * Bridges between order fulfillment and logistics execution.
 *
 * Tables:
 * - dispatch_routes: Daily delivery routes
 * - dispatch_route_stops: Individual stops on a route
 * - dispatch_pod_items: Proof of delivery tracking (item-level)
 */

export async function up(knex: Knex): Promise<void> {
  // MUTABLE: Dispatch route management
  await knex.schema.createTable("dispatch_routes", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.uuid("assigned_to_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");

    // Route details
    table.date("planned_date").notNullable();
    table.uuid("vehicle_id").nullable(); // Can be assigned later
    table.string("vehicle_type", 50).nullable(); // bike, auto, van, truck

    // Route status: planning → assigned → in_transit → completed → archived
    table.string("status", 32).notNullable().defaultTo("planning");

    // Optimization metadata
    table.jsonb("optimized_geometry").notNullable().defaultTo("{}"); // GeoJSON coordinates for route mapping
    table.decimal("estimated_distance_km", 10, 2).nullable();
    table.integer("estimated_delivery_time_min").nullable(); // Minutes

    // Actual execution data (populated on route completion)
    table.jsonb("actual_geometry").nullable(); // GPS tracks from driver
    table.decimal("actual_distance_km", 10, 2).nullable();
    table.integer("actual_delivery_time_min").nullable();
    table.timestamp("departed_at", { useTz: true }).nullable();
    table.timestamp("completed_at", { useTz: true }).nullable();

    // Audit
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id", "planned_date"]);
    table.index(["tenant_id", "status"]);
    table.index(["assigned_to_user_id"]);
  });

  // MUTABLE: Individual stops within a route
  await knex.schema.createTable("dispatch_route_stops", (table) => {
    table.uuid("id").primary();
    table.uuid("dispatch_route_id").notNullable().references("id").inTable("dispatch_routes").onDelete("CASCADE");
    table.uuid("retailer_id").notNullable().references("id").inTable("retailers").onDelete("RESTRICT");
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");

    // Sequencing within route
    table.integer("sequence_no").notNullable(); // Order on the route
    table.decimal("route_latitude", 10, 8).nullable();
    table.decimal("route_longitude", 11, 8).nullable();

    // Orders delivered at this stop
    table.jsonb("order_ids").notNullable().defaultTo("[]"); // Array of order UUIDs

    // Delivery tracking
    table.timestamp("planned_arrival_time", { useTz: true }).nullable();
    table.timestamp("actual_arrival_time", { useTz: true }).nullable();
    table.timestamp("actual_departure_time", { useTz: true }).nullable();
    table.integer("stop_duration_min").nullable(); // Time spent at stop

    // Delivery notes
    table.text("delivery_notes").nullable();
    table.string("delivery_status", 32).defaultTo("pending"); // pending, in_progress, completed, partially_completed, failed

    // Proof of delivery
    table.string("pod_signature_url", 500).nullable();
    table.jsonb("pod_photos").notNullable().defaultTo("[]"); // Array of photo URLs
    table.string("pod_receiver_name", 100).nullable();
    table.timestamp("pod_timestamp", { useTz: true }).nullable();

    // Audit
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("dispatch_route_id");
    table.index("retailer_id");
    table.index("tenant_id");
    table.index(["dispatch_route_id", "sequence_no"]);
  });

  // IMMUTABLE: Proof of delivery tracking (item-level)
  await knex.schema.createTable("dispatch_pod_items", (table) => {
    table.uuid("id").primary();
    table.uuid("route_stop_id").notNullable().references("id").inTable("dispatch_route_stops").onDelete("CASCADE");
    table.uuid("order_line_item_id").notNullable().references("id").inTable("order_line_items").onDelete("RESTRICT");
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");

    // Delivery quantities (may differ if short delivery or damage)
    table.decimal("quantity_ordered", 14, 3).notNullable();
    table.decimal("quantity_delivered", 14, 3).notNullable();
    table.decimal("quantity_rejected", 14, 3).defaultTo(0);

    // Item condition at delivery
    table.string("condition", 32).notNullable().defaultTo("acceptable"); // acceptable, damaged, rejected, expired
    table.text("damage_description").nullable();

    // Reason for partial/failed delivery
    table.string("shortfall_reason", 100).nullable(); // stock_shortage, damage_in_transit, customer_refused, etc.

    // Audit trail
    table.uuid("verified_by_user_id").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("verified_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("route_stop_id");
    table.index("order_line_item_id");
    table.index("tenant_id");
    table.index("created_at");
  });

  // MUTABLE: Dispatch performance metrics (aggregated for reporting)
  await knex.schema.createTable("dispatch_performance_summary", (table) => {
    table.uuid("id").primary();
    table.uuid("tenant_id").notNullable().references("id").inTable("tenants").onDelete("CASCADE");
    table.date("summary_date").notNullable();

    // Delivery metrics
    table.integer("total_routes").defaultTo(0);
    table.integer("total_stops").defaultTo(0);
    table.integer("total_orders_delivered").defaultTo(0);
    table.decimal("avg_delivery_time_min", 10, 2).nullable();
    table.decimal("avg_items_per_route", 10, 2).nullable();

    // Quality metrics
    table.decimal("on_time_delivery_percent", 5, 2).defaultTo(0);
    table.decimal("complete_delivery_percent", 5, 2).defaultTo(0);
    table.integer("damaged_items_count").defaultTo(0);
    table.integer("rejected_items_count").defaultTo(0);

    // Operational metrics
    table.integer("total_distance_km").nullable();
    table.integer("active_vehicles").defaultTo(0);
    table.integer("active_drivers").defaultTo(0);

    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["tenant_id", "summary_date"]);
    table.index(["tenant_id", "summary_date"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("dispatch_performance_summary");
  await knex.schema.dropTableIfExists("dispatch_pod_items");
  await knex.schema.dropTableIfExists("dispatch_route_stops");
  await knex.schema.dropTableIfExists("dispatch_routes");
}
