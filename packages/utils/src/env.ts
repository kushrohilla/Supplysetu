import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

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
  DB_SSL: booleanParser.default(false),
});

const DEVELOPMENT_DEFAULTS = {
  JWT_SECRET: "replace-with-a-strong-secret-key",
  JWT_REFRESH_SECRET: "replace-with-a-strong-refresh-secret",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/supplysetu",
} as const;

export const loadEnv = () => {
  const parsed = baseEnvSchema.superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (!env.DATABASE_URL) {
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

  return {
    ...parsed,
    JWT_SECRET: parsed.JWT_SECRET ?? DEVELOPMENT_DEFAULTS.JWT_SECRET,
    JWT_REFRESH_SECRET: parsed.JWT_REFRESH_SECRET ?? DEVELOPMENT_DEFAULTS.JWT_REFRESH_SECRET,
    DATABASE_URL: parsed.DATABASE_URL ?? DEVELOPMENT_DEFAULTS.DATABASE_URL,
  };
};
