import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { proofs } from "../proof/model";
import { users } from "../user/model";

export const proofLikes = pgTable(
  "proof_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proofId: uuid("proof_id")
      .notNull()
      .references(() => proofs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("proof_likes_proof_user_key").on(t.proofId, t.userId)],
);

export const proofComments = pgTable(
  "proof_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proofId: uuid("proof_id")
      .notNull()
      .references(() => proofs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("proof_comments_proof_idx").on(t.proofId, t.createdAt.asc()),

    index("proof_comments_user_recent_idx").on(t.userId, t.createdAt.desc()),
  ],
);
