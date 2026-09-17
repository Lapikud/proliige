import { index, integer, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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
  },
  (t) => [
    uniqueIndex("points_ledger_proof_key").on(t.proofId),
    index("points_ledger_user_idx").on(t.userId),
  ],
);
