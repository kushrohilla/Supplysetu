import { initializeDatabase, runMigrations } from "../../../../packages/database";
import { buildApp } from "./app";
import { env, logger } from "./config";

const start = async () => {
  const PORT = Number(process.env.PORT || env.PORT || 5000);

  try {
    // Initialize the shared Knex instance before the app is created.
    const db = initializeDatabase(env);

    // Never start accepting traffic until the schema is at the required version.
    await runMigrations(db, logger);

    const app = await buildApp(db);

    await app.listen({
      host: "0.0.0.0",
      port: PORT,
    });
    logger.info({ port: PORT }, "Backend server started");
  } catch (error) {
    logger.error({ err: error }, "Failed to start backend server");
    process.exit(1);
  }
};

void start();
