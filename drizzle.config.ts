import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (process.env.DATABASE_URL === undefined && existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infra/db/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
