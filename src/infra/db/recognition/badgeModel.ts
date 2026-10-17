import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { ne } from "drizzle-orm";
import { predicate } from "../predicate";
import { users } from "../user/model";

export const recognitionBadges = pgTable(
  "recognition_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    labelKey: text("label_key").notNull(),
    imageUrl: text("image_url"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("recognition_badges_label_key_key").on(t.labelKey),
    index("recognition_badges_created_idx").on(t.createdAt.desc()),
    check("recognition_badges_label_nonempty_check", predicate(ne(t.label, ""))),
  ],
);
