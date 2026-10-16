import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { proofs } from "../proof/model";
import { users } from "../user/model";

export const pointsLedger = pgTable(
  "points_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    proofId: uuid("proof_id")
      .notNull()
      .references(() => proofs.id, { onDelete: "restrict" }),
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
      .where(sql`${t.reversalOf} IS NULL`),
    uniqueIndex("points_ledger_reversal_of_key")
      .on(t.reversalOf)
      .where(sql`${t.reversalOf} IS NOT NULL`),
    index("points_ledger_user_idx").on(t.userId),
  ],
);
