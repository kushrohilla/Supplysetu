import knex, { type Knex } from "knex";

export type DatabaseEnv = {
  NODE_ENV: "development" | "test" | "production";
  DATABASE_URL: string;
  DB_SSL: boolean;
};

export type DatabaseLogger = {
  info: (details: Record<string, unknown>, message: string) => void;
  error: (details: Record<string, unknown>, message: string) => void;
};

let databaseInstance: Knex | null = null;

export const createKnexConfig = (env: DatabaseEnv): Knex.Config => ({
  client: "pg",
  connection: env.DB_SSL
    ? {
        connectionString: env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : env.DATABASE_URL,
  pool: env.NODE_ENV === "production" ? { min: 2, max: 10 } : { min: 1, max: 5 },
  migrations: {
    // The same config works for local tsx execution and compiled Railway builds.
    directory: env.NODE_ENV === "production" ? "./dist/packages/database/migrations" : "./packages/database/migrations",
    extension: env.NODE_ENV === "production" ? "js" : "ts",
  },
});

export const initializeDatabase = (env: DatabaseEnv): Knex => {
  if (!databaseInstance) {
    databaseInstance = knex(createKnexConfig(env));
  }

  return databaseInstance;
};

export const getDatabase = (): Knex => {
  if (!databaseInstance) {
    throw new Error("Database has not been initialized");
  }

  return databaseInstance;
};

export const runMigrations = async (db: Knex, logger: DatabaseLogger): Promise<void> => {
  logger.info({}, "Running DB migrations...");

  try {
    const [batchNumber, migrationFiles] = await db.migrate.latest();

    logger.info(
      {
        batchNumber,
        migrationCount: migrationFiles.length,
        migrations: migrationFiles,
      },
      "Migrations complete",
    );
  } catch (error) {
    logger.error(
      {
        err: error,
        reason: error instanceof Error ? error.message : "Unknown migration failure",
      },
      "Database migration failed",
    );
    throw error;
  }
};
