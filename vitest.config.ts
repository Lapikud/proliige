import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./tests/globalSetup";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration tests share one database and empty it between cases.
    fileParallelism: false,
    globalSetup: ["tests/globalSetup.ts"],
    testTimeout: 20_000,
    env: {
      DATABASE_URL: testDatabaseUrl(),
      SESSION_SECRET: "test-session-secret-that-is-at-least-32-characters",
      FREEIPA_SERVER: "ipa.test.invalid",
      STORAGE_DRIVER: "memory",
    },
    hookTimeout: 20_000,
  },
  resolve: {
    alias: { "~": resolve(import.meta.dirname, "src") },
  },
});
