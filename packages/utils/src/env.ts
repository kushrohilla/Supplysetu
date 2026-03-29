import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const booleanParser = z.preprocess((value) => {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return value;
}, z.boolean());

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().min(1).default("/api/v1"),
  CORS_ORIGINS: z.string().default("http://localhost:8081,http://127.0.0.1:8081,http://localhost:3000,http://10.0.2.2:3000"),
  TRUST_PROXY: booleanParser.default(false),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  JWT_SECRET: z.string().min(16).optional(),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().min(1).default("1d"),
  DATABASE_URL: z.string().min(1).optional(),
  SKIP_MIGRATIONS: booleanParser.default(false),
  DB_HOST: z.string().min(1).optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_NAME: z.string().min(1).optional(),
  DB_USER: z.string().min(1).optional(),
  DB_PASSWORD: z.string().optional(),
  DB_SSL: booleanParser.default(false),
});

const DEVELOPMENT_DEFAULTS = {
  JWT_SECRET: "replace-with-a-strong-secret-key",
  JWT_REFRESH_SECRET: "replace-with-a-strong-refresh-secret",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/supplysetu",
} as const;

const hasLegacyDatabaseConfig = (env: {
  DB_HOST?: string;
  DB_PORT?: number;
  DB_NAME?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
}) =>
  Boolean(env.DB_HOST ?? env.DB_PORT ?? env.DB_NAME ?? env.DB_USER ?? env.DB_PASSWORD);

const hasCompleteLegacyDatabaseConfig = (env: {
  DB_HOST?: string;
  DB_NAME?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
}) => Boolean(env.DB_HOST && env.DB_NAME && env.DB_USER && env.DB_PASSWORD !== undefined);

const buildLegacyDatabaseUrl = (env: {
  DB_HOST?: string;
  DB_PORT?: number;
  DB_NAME?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
}) => {
  if (!hasCompleteLegacyDatabaseConfig(env)) {
    return undefined;
  }

  const host = env.DB_HOST!;
  const database = env.DB_NAME!;
  const user = env.DB_USER!;
  const password = env.DB_PASSWORD!;
  const port = env.DB_PORT ?? 5432;

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
};

export const loadEnv = () => {
  const parsed = baseEnvSchema.superRefine((env, ctx) => {
    const legacyDatabaseIsConfigured = hasLegacyDatabaseConfig(env);
    const legacyDatabaseIsComplete = hasCompleteLegacyDatabaseConfig(env);

    if (!env.DATABASE_URL && legacyDatabaseIsConfigured && !legacyDatabaseIsComplete) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is missing and legacy DB_* settings are incomplete",
      });
    }

    if (env.NODE_ENV === "production") {
      if (!env.DATABASE_URL && !legacyDatabaseIsComplete) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["DATABASE_URL"],
          message: "DATABASE_URL is required in production",
        });
      }

      if (!env.JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "JWT_SECRET is required in production",
        });
      }

      if (!env.JWT_REFRESH_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_REFRESH_SECRET"],
          message: "JWT_REFRESH_SECRET is required in production",
        });
      }
    }
  }).parse(process.env);

  const legacyDatabaseUrl = buildLegacyDatabaseUrl(parsed);

  return {
    ...parsed,
    JWT_SECRET: parsed.JWT_SECRET ?? DEVELOPMENT_DEFAULTS.JWT_SECRET,
    JWT_REFRESH_SECRET: parsed.JWT_REFRESH_SECRET ?? DEVELOPMENT_DEFAULTS.JWT_REFRESH_SECRET,
    DATABASE_URL: parsed.DATABASE_URL ?? legacyDatabaseUrl ?? DEVELOPMENT_DEFAULTS.DATABASE_URL,
  };
};
