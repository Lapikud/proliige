import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "~/env.config";
import postgres from "postgres";
import { photoBackups } from "~/infra/db/backup/model";
import { categories } from "~/infra/db/category/model";
import { proofPhotos, proofs } from "~/infra/db/proof/model";
import { proofComments, proofLikes } from "~/infra/db/feed/model";
import { users } from "~/infra/db/user/model";
import { notifications } from "~/infra/db/notification/model";
import { pointsLedger } from "~/infra/db/points/model";
import * as schema from "~/infra/db/schema";
import { tasks } from "~/infra/db/task/model";
import { vi } from "vitest";
import type { AdminDirectoryPort, NotificationPort } from "~/core/ports/notification";
import type { UserRepository } from "~/core/ports/user";
import type { Notification } from "~/domain/notification";

export function connect() {
  const client = postgres(env.DATABASE_URL, { max: 4 });

  return {
    client,
    db: drizzle(client, { schema }),
  };
}

export type TestDatabase = ReturnType<typeof connect>["db"];

export async function truncateAll(db: TestDatabase): Promise<void> {
  await db.delete(photoBackups);
  await db.delete(proofLikes);
  await db.delete(proofComments);
  await db.delete(proofPhotos);
  await db.delete(pointsLedger);
  await db.delete(notifications);
  await db.delete(proofs);
  await db.delete(tasks);
  await db.delete(users);
  await db.delete(categories);
}

export function fixedClock(at: Date) {
  let now = at;

  return {
    now: () => now,
    advanceSeconds(seconds: number) {
      now = new Date(now.getTime() + seconds * 1000);
    },
  };
}

export function fakeNotificationPort() {
  return {
    publish: vi.fn<NotificationPort["publish"]>(() => Promise.resolve({} as Notification)),
    publishMany: vi.fn<NotificationPort["publishMany"]>(() => Promise.resolve([])),
    list: vi.fn<NotificationPort["list"]>(() => Promise.resolve([])),
    unreadCount: vi.fn<NotificationPort["unreadCount"]>(() => Promise.resolve(0)),
    markRead: vi.fn<NotificationPort["markRead"]>(() => Promise.resolve()),
    markAllRead: vi.fn<NotificationPort["markAllRead"]>(() => Promise.resolve()),
    since: vi.fn<NotificationPort["since"]>(() => Promise.resolve([])),
    subscribe: vi.fn<NotificationPort["subscribe"]>(() => () => undefined),
  } satisfies NotificationPort;
}

export async function seedUsers(users: UserRepository) {
  const signUp = (uid: string, displayName: string, groups: Array<string>) =>
    users.upsertFromIdentity({
      ipaUniqueId: `ipa-${uid}`,
      uid,
      displayName,
      groups,
    });

  return {
    alice: await signUp("alice", "Alice", ["members"]),
    bob: await signUp("bob", "Bob", ["members"]),
    admin: await signUp("boss", "Boss", ["team_juhatus"]),
    outsider: await signUp("outsider", "Outsider", ["guests"]),
  };
}

export const noAdmins: AdminDirectoryPort = {
  listAdmins: () => Promise.resolve([]),
};
