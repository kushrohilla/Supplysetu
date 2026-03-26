import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanParser = z.preprocess((value) => {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().min(1).default("/api/v1"),
  CORS_ORIGINS: z.string().default("http://localhost:8081,http://127.0.0.1:8081,http://localhost:3000,http://10.0.2.2:3000"),
  TRUST_PROXY: booleanParser.default(false),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  JWT_SECRET: z.string().min(16).default("replace-with-a-strong-secret-key"),
  JWT_REFRESH_SECRET: z.string().min(16).default("replace-with-a-strong-refresh-secret"),
  JWT_EXPIRES_IN: z.string().min(1).default("1d"),
  DB_HOST: z.string().min(1).default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1).default("supplysetu"),
  DB_USER: z.string().min(1).default("postgres"),
  DB_PASSWORD: z.string().min(1).default("postgres"),
  DB_SSL: booleanParser.default(false),
});

export const loadEnv = () => envSchema.parse(process.env);
