import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../user/model";

export const recognitionBadges = pgTable(
  "recognition_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    imageUrl: text("image_url"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("recognition_badges_label_lower_key").on(sql`lower(${t.label})`),
    index("recognition_badges_created_idx").on(t.createdAt.desc()),
    check("recognition_badges_label_nonempty_check", sql`length(trim(${t.label})) > 0`),
  ],
);
