import { and, isNotNull, isNull, or } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { predicate } from "../predicate";
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
    check("proof_likes_target_check", exactlyOneTarget(t)),
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
    check("proof_comments_target_check", exactlyOneTarget(t)),

    index("proof_comments_user_recent_idx").on(t.userId, t.createdAt.desc()),
  ],
);

function exactlyOneTarget(t: { proofId: AnyPgColumn; recognitionId: AnyPgColumn }) {
  return predicate(
    or(
      and(isNotNull(t.proofId), isNull(t.recognitionId)),
      and(isNull(t.proofId), isNotNull(t.recognitionId)),
    ),
  );
}
