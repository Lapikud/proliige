import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export default async function setup(): Promise<void> {
  const url = new URL(testDatabaseUrl());
  const name = url.pathname.slice(1);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const server = postgres(admin.href, {
    max: 1,
    onnotice: () => undefined,
  });
  const [existing] = await server`select 1 from pg_database where datname = ${name}`;
  if (existing === undefined) {
    await server.unsafe(`create database "${name.replaceAll('"', '""')}"`);
  }
  await server.end();

  const client = postgres(url.href, {
    max: 1,
    onnotice: () => undefined,
  });
  await migrate(drizzle(client), { migrationsFolder: "migrations" });
  await client.end();
}

export function testDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? "postgres://lapikud:lapikud@localhost:5432/lapikud_test";
}
