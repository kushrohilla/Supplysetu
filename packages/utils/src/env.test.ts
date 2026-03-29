import { afterEach, describe, expect, it } from "vitest";

import { loadEnv } from "./env";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("loadEnv", () => {
  it("builds DATABASE_URL from legacy DB_* variables when DATABASE_URL is missing", () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "development",
      PORT: "3000",
      API_PREFIX: "/api/v1",
      CORS_ORIGINS: "http://localhost:3000",
      TRUST_PROXY: "false",
      LOG_LEVEL: "info",
      JWT_SECRET: "replace-with-a-strong-secret-key",
      JWT_REFRESH_SECRET: "replace-with-a-strong-refresh-secret",
      DB_HOST: "db.example.com",
      DB_PORT: "5432",
      DB_NAME: "supplysetu",
      DB_USER: "app-user",
      DB_PASSWORD: "pa:ss/word",
      DB_SSL: "true",
    };

    delete process.env.DATABASE_URL;

    expect(loadEnv().DATABASE_URL).toBe(
      "postgresql://app-user:pa%3Ass%2Fword@db.example.com:5432/supplysetu",
    );
  });

  it("parses SKIP_MIGRATIONS from the environment", () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "development",
      PORT: "3000",
      API_PREFIX: "/api/v1",
      CORS_ORIGINS: "http://localhost:3000",
      TRUST_PROXY: "false",
      LOG_LEVEL: "info",
      JWT_SECRET: "replace-with-a-strong-secret-key",
      JWT_REFRESH_SECRET: "replace-with-a-strong-refresh-secret",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/supplysetu",
      SKIP_MIGRATIONS: "true",
    };

    expect(loadEnv()).toHaveProperty("SKIP_MIGRATIONS", true);
  });
});
