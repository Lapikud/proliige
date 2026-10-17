import { and, isNotNull, isNull, or } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { predicate } from "../predicate";
import { proofs } from "../proof/model";
import { recognitions } from "../recognition/model";
import { users } from "../user/model";

export const pointsLedger = pgTable(
  "points_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    proofId: uuid("proof_id").references(() => proofs.id, { onDelete: "restrict" }),
    recognitionId: uuid("recognition_id").references(() => recognitions.id, {
      onDelete: "restrict",
    }),
    points: integer("points").notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
    reversalOf: uuid("reversal_of").references((): AnyPgColumn => pointsLedger.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("points_ledger_proof_key")
      .on(t.proofId)
      .where(predicate(and(isNotNull(t.proofId), isNull(t.reversalOf)))),
    uniqueIndex("points_ledger_recognition_key")
      .on(t.recognitionId)
      .where(predicate(and(isNotNull(t.recognitionId), isNull(t.reversalOf)))),
    uniqueIndex("points_ledger_reversal_of_key")
      .on(t.reversalOf)
      .where(predicate(isNotNull(t.reversalOf))),
    index("points_ledger_user_idx").on(t.userId),
    check(
      "points_ledger_source_check",
      predicate(
        or(
          and(isNotNull(t.proofId), isNull(t.recognitionId)),
          and(isNull(t.proofId), isNotNull(t.recognitionId)),
        ),
      ),
    ),
  ],
);
