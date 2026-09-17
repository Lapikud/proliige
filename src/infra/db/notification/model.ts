import { isNull } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { predicate } from "../predicate";
import { proofs } from "../proof/model";
import { users } from "../user/model";
import { tasks } from "../task/model";

export const notificationTypeEnum = pgEnum("notification_type", [
  "proof_submitted",
  "review_requested",
  "proof_approved",
  "proof_rejected",
  "proof_commented",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    proofId: uuid("proof_id").references(() => proofs.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientUserId, t.createdAt.desc()),
    index("notifications_unread_idx")
      .on(t.recipientUserId)
      .where(predicate(isNull(t.readAt))),
  ],
);
