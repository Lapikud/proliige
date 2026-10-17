import { isNull } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { predicate } from "../predicate";
import { categories } from "../category/model";
import { users } from "../user/model";

export const taskPolicyEnum = pgEnum("task_policy", [
  "single_winner",
  "one_per_user",
  "repeatable",
]);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    points: integer("points").notNull(),
    policy: taskPolicyEnum("policy").notNull(),

    cooldownSeconds: integer("cooldown_seconds"),
    photoRequired: boolean("photo_required").notNull().default(false),
    photoInstructions: text("photo_instructions"),
    textRequired: boolean("text_required").notNull().default(false),
    showOnFeed: boolean("show_on_feed").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }),
    suggestedBy: uuid("suggested_by").references(() => users.id, { onDelete: "restrict" }),
    suggestionPending: boolean("suggestion_pending").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removedBy: uuid("removed_by").references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tasks_category_idx").on(t.categoryId),
    index("tasks_active_idx").on(t.archivedAt),
    index("tasks_active_category_title_idx")
      .on(t.categoryId, t.title)
      .where(predicate(isNull(t.archivedAt))),
  ],
);
