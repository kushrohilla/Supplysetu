import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasTenants = await knex.schema.hasTable("tenants");
  if (hasTenants) {
    const hasOwnerName = await knex.schema.hasColumn("tenants", "owner_name");
    if (!hasOwnerName) {
      await knex.schema.alterTable("tenants", (table) => {
        table.string("owner_name", 255).nullable();
      });
    }

    const hasMobileNumber = await knex.schema.hasColumn("tenants", "mobile_number");
    if (!hasMobileNumber) {
      await knex.schema.alterTable("tenants", (table) => {
        table.string("mobile_number", 20).nullable();
      });
    }

    const hasGstNumber = await knex.schema.hasColumn("tenants", "gst_number");
    if (!hasGstNumber) {
      await knex.schema.alterTable("tenants", (table) => {
        table.string("gst_number", 32).nullable();
      });
    }

    const hasFullAddress = await knex.schema.hasColumn("tenants", "full_address");
    if (!hasFullAddress) {
      await knex.schema.alterTable("tenants", (table) => {
        table.text("full_address").nullable();
      });
    }
  }

  const hasUsers = await knex.schema.hasTable("users");
  if (hasUsers) {
    const hasUsername = await knex.schema.hasColumn("users", "username");
    if (!hasUsername) {
      await knex.schema.alterTable("users", (table) => {
        table.string("username", 255).nullable();
      });
    }

    const hasMobileNumber = await knex.schema.hasColumn("users", "mobile_number");
    if (!hasMobileNumber) {
      await knex.schema.alterTable("users", (table) => {
        table.string("mobile_number", 20).nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasUsers = await knex.schema.hasTable("users");
  if (hasUsers) {
    const hasUsername = await knex.schema.hasColumn("users", "username");
    const hasMobileNumber = await knex.schema.hasColumn("users", "mobile_number");

    if (hasUsername || hasMobileNumber) {
      await knex.schema.alterTable("users", (table) => {
        if (hasUsername) {
          table.dropColumn("username");
        }
        if (hasMobileNumber) {
          table.dropColumn("mobile_number");
        }
      });
    }
  }

  const hasTenants = await knex.schema.hasTable("tenants");
  if (hasTenants) {
    const hasOwnerName = await knex.schema.hasColumn("tenants", "owner_name");
    const hasMobileNumber = await knex.schema.hasColumn("tenants", "mobile_number");
    const hasGstNumber = await knex.schema.hasColumn("tenants", "gst_number");
    const hasFullAddress = await knex.schema.hasColumn("tenants", "full_address");

    if (hasOwnerName || hasMobileNumber || hasGstNumber || hasFullAddress) {
      await knex.schema.alterTable("tenants", (table) => {
        if (hasOwnerName) {
          table.dropColumn("owner_name");
        }
        if (hasMobileNumber) {
          table.dropColumn("mobile_number");
        }
        if (hasGstNumber) {
          table.dropColumn("gst_number");
        }
        if (hasFullAddress) {
          table.dropColumn("full_address");
        }
      });
    }
  }
}
