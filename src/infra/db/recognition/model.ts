import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../user/model";

export interface AchievementLink {
  readonly title: string;
  readonly url: string;
}

export const recognitions = pgTable(
  "recognitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    descriptionMarkdown: boolean("description_markdown").notNull().default(false),
    points: integer("points").notNull(),
    badges: text("badges").array().notNull().default([]),
    links: jsonb("links").$type<Array<AchievementLink>>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recognitions_recipient_created_idx").on(t.recipientId, t.createdAt.desc()),
    index("recognitions_created_idx").on(t.createdAt.desc(), t.id.desc()),
    check("recognitions_points_positive_check", sql`${t.points} > 0`),
  ],
);
