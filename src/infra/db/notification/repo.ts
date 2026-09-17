import { and, count, desc, eq, gt, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { NotificationPort } from "~/core/ports/notification";
import type { NewNotification, Notification } from "~/domain/notification";
import type { Database } from "../client";
import { notifications } from "./model";
import { registry } from "./events";
import { onlyRow } from "../rows";

type Row = typeof notifications.$inferSelect;

function toNotification(row: Row): Notification {
  return {
    id: row.id,
    recipientUserId: row.recipientUserId,
    type: row.type,
    title: row.title,
    message: row.message,
    proofId: row.proofId,
    taskId: row.taskId,
    createdAt: row.createdAt,
    readAt: row.readAt,
  };
}

export function createNotificationAdapter(db: Database): NotificationPort {
  return {
    async publish(input) {
      const created = onlyRow(await insertAll(db, [input]));
      registry().emit(created);

      return created;
    },

    async publishMany(inputs) {
      if (inputs.length === 0) {
        return [];
      }
      const created = await insertAll(db, inputs);
      for (const notification of created) {
        registry().emit(notification);
      }

      return created;
    },

    async list(userId, limit = 50) {
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.recipientUserId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

      return rows.map(toNotification);
    },

    async unreadCount(userId) {
      const { count: unreadCount } = onlyRow(
        await db
          .select({ count: count() })
          .from(notifications)
          .where(and(eq(notifications.recipientUserId, userId), isNull(notifications.readAt))),
      );

      return unreadCount;
    },

    async markRead(userId, notificationId) {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(eq(notifications.id, notificationId), eq(notifications.recipientUserId, userId)),
        );
    },

    async markAllRead(userId) {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.recipientUserId, userId), isNull(notifications.readAt)));
    },

    async since(userId, notificationId) {
      const anchor = alias(notifications, "anchor");
      const anchorValue = (column: typeof anchor.createdAt | typeof anchor.id) =>
        db.select({ value: column }).from(anchor).where(eq(anchor.id, notificationId));

      const rows = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientUserId, userId),
            or(
              gt(notifications.createdAt, anchorValue(anchor.createdAt)),
              and(
                eq(notifications.createdAt, anchorValue(anchor.createdAt)),
                gt(notifications.id, anchorValue(anchor.id)),
              ),
            ),
          ),
        )
        .orderBy(notifications.createdAt, notifications.id);

      return rows.map(toNotification);
    },

    subscribe(userId, listener) {
      return registry().subscribe(userId, listener);
    },
  };
}

async function insertAll(
  db: Database,
  inputs: ReadonlyArray<NewNotification>,
): Promise<Array<Notification>> {
  const rows = await db
    .insert(notifications)
    .values(
      inputs.map((input) => ({
        recipientUserId: input.recipientUserId,
        type: input.type,
        title: input.title,
        message: input.message,
        proofId: input.proofId ?? null,
        taskId: input.taskId ?? null,
      })),
    )
    .returning();

  return rows.map(toNotification);
}
