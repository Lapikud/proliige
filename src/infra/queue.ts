import { PgBoss } from "pg-boss";
import type { ServerLogger } from "~/lib/logging/server";

export type Boss = () => Promise<PgBoss>;

export function createBoss(databaseUrl: string, logger: Pick<ServerLogger, "error">): Boss {
  const boss = new PgBoss(databaseUrl);
  boss.on("error", (error) => {
    logger.error("queue.error", error);
  });

  let started: Promise<PgBoss> | null = null;

  return () => (started ??= boss.start());
}

export async function ensureQueue(boss: PgBoss, name: string): Promise<void> {
  if ((await boss.getQueue(name)) === null) {
    await boss.createQueue(name, {
      retryLimit: 5,
      retryBackoff: true,
    });
  }
}
