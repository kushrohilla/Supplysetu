import knex, { type Knex } from "knex";

export type DatabaseEnv = {
  NODE_ENV: "development" | "test" | "production";
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;
};

export const createKnexConfig = (env: DatabaseEnv): Knex.Config => ({
  client: "pg",
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  },
  pool: env.NODE_ENV === "production" ? { min: 2, max: 10 } : { min: 1, max: 5 },
  migrations: {
    directory: env.NODE_ENV === "production" ? "./dist/packages/database/migrations" : "./packages/database/migrations",
    extension: env.NODE_ENV === "production" ? "js" : "ts",
  },
});

export const createDatabase = (env: DatabaseEnv) => knex(createKnexConfig(env));
