import { initializeDatabase, runMigrations } from "../../../../packages/database";
import { buildApp } from "./app";
import { env, logger } from "./config";

const describeDatabaseTarget = (databaseUrl: string) => {
  try {
    const parsed = new URL(databaseUrl);

    return {
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.hostname,
      port: parsed.port || "5432",
      database: parsed.pathname.replace(/^\//, "") || "unknown",
    };
  } catch {
    return {
      protocol: "unknown",
      host: "unknown",
      port: "unknown",
      database: "unknown",
    };
  }
};

const start = async () => {
  const PORT = Number(process.env.PORT || env.PORT || 5000);

  try {
    logger.info(
      {
        nodeEnv: env.NODE_ENV,
        port: PORT,
        dbSsl: env.DB_SSL,
        databaseTarget: describeDatabaseTarget(env.DATABASE_URL),
      },
      "Starting backend bootstrap",
    );

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
    const reason = error instanceof Error ? error.message : "Unknown startup error";
    const stack = error instanceof Error ? error.stack : undefined;

    console.error(`Failed to start backend server: ${reason}`);
    if (stack) {
      console.error(stack);
    }

    logger.error(
      {
        err: error,
        reason,
        stack,
      },
      "Failed to start backend server",
    );
    process.exit(1);
  }
};

void start();
