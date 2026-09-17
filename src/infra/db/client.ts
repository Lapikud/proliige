import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "~/env.config";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof postgres>;
};

function connection() {
  globalForDb.db ??= postgres(env.DATABASE_URL, { max: 10 });

  return globalForDb.db;
}

function createDatabase() {
  return drizzle(connection(), { schema });
}

export type Database = ReturnType<typeof createDatabase>;

let cached: Database | undefined;

export function getDatabase(): Database {
  return new Proxy({} as Database, {
    get(_target, property, receiver) {
      cached ??= createDatabase();
      const value: unknown = Reflect.get(cached, property, receiver);

      return typeof value === "function"
        ? (value as (...args: Array<unknown>) => unknown).bind(cached)
        : value;
    },
  });
}

export { schema };
