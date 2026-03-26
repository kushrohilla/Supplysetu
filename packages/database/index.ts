import knex, { type Knex } from "knex";
import path from "node:path";

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

const resolveMigrationsDirectory = () => path.resolve(__dirname, "migrations");

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
    // Resolve from this file so local tsx and compiled deployments both find the right folder.
    directory: resolveMigrationsDirectory(),
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
    const reason = error instanceof Error ? error.message : "Unknown migration failure";
    const stack = error instanceof Error ? error.stack : undefined;
    const serializedError = JSON.stringify(
      {
        reason,
        stack,
        error,
      },
      null,
      2,
    );

    // Railway collapses structured logger metadata in some views, so emit a plain-text copy too.
    console.error(`Database migration failed: ${reason}`);
    if (stack) {
      console.error(stack);
    } else {
      console.error(serializedError);
    }

    logger.error(
      {
        err: error,
        reason,
        stack,
      },
      "Database migration failed",
    );
    throw error;
  }
};
