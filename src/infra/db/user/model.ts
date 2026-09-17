import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    ipaUniqueId: text("ipa_unique_id").notNull(),
    uid: text("uid").notNull(),
    displayName: text("display_name").notNull(),

    freeipaGroups: text("freeipa_groups").array().notNull().default([]),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_ipa_unique_id_key").on(t.ipaUniqueId),
    uniqueIndex("users_uid_key").on(t.uid),
  ],
);
