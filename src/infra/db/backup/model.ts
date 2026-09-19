import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const photoBackups = pgTable("photo_backups", {
  objectKey: text("object_key").primaryKey(),
  backedUpAt: timestamp("backed_up_at", { withTimezone: true }).notNull(),
  missing: boolean("missing").notNull().default(false),
});
