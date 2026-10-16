import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { proofs } from "../proof/model";
import { recognitions } from "../recognition/model";
import { users } from "../user/model";

export const proofLikes = pgTable(
  "proof_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proofId: uuid("proof_id").references(() => proofs.id, { onDelete: "cascade" }),
    recognitionId: uuid("recognition_id").references(() => recognitions.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("proof_likes_proof_user_key").on(t.proofId, t.userId),
    uniqueIndex("proof_likes_recognition_user_key").on(t.recognitionId, t.userId),
    check("proof_likes_target_check", sql`num_nonnulls(${t.proofId}, ${t.recognitionId}) = 1`),
  ],
);

export const proofComments = pgTable(
  "proof_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proofId: uuid("proof_id").references(() => proofs.id, { onDelete: "cascade" }),
    recognitionId: uuid("recognition_id").references(() => recognitions.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("proof_comments_proof_idx").on(t.proofId, t.createdAt.asc()),
    index("proof_comments_recognition_idx").on(t.recognitionId, t.createdAt.asc()),
    check(
      "proof_comments_target_check",
      sql`num_nonnulls(${t.proofId}, ${t.recognitionId}) = 1`,
    ),

    index("proof_comments_user_recent_idx").on(t.userId, t.createdAt.desc()),
  ],
);
