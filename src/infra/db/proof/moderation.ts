import { and, eq, isNull } from "drizzle-orm";
import type { ProofRepository } from "~/core/ports/proof";
import { conflict, notFound } from "~/domain/errors";
import type { Database } from "../client";
import { pointsLedger } from "../points/model";
import { proofReports, proofs } from "./model";
import { toProof } from "./map";

type Moderation = Pick<ProofRepository, "setHidden" | "unapprove" | "report" | "dismissReports">;

export function createProofModeration(db: Database): Moderation {
  return {
    async setHidden({ proofId, hidden, hiddenBy, now }) {
      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(proofs)
          .set(
            hidden
              ? {
                  hiddenAt: now,
                  hiddenBy,
                }
              : {
                  hiddenAt: null,
                  hiddenBy: null,
                },
          )
          .where(and(eq(proofs.id, proofId), eq(proofs.status, "approved")))
          .returning();
        if (updated === undefined) {
          const [existing] = await tx.select().from(proofs).where(eq(proofs.id, proofId)).limit(1);
          if (existing === undefined) throw notFound("That proof does not exist.");
          throw conflict("Only approved proofs are on the feed.");
        }
        if (hidden) {
          await tx
            .update(proofReports)
            .set({
              resolvedAt: now,
              resolvedBy: hiddenBy,
            })
            .where(and(eq(proofReports.proofId, proofId), isNull(proofReports.resolvedAt)));
        }

        return toProof(updated);
      });
    },

    async unapprove({ proofId, reviewerId, reason, now }) {
      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(proofs)
          .set({
            status: "rejected",
            rejectionReason: reason,
            reviewedAt: now,
            reviewedBy: reviewerId,
          })
          .where(and(eq(proofs.id, proofId), eq(proofs.status, "approved")))
          .returning();
        if (updated === undefined) {
          const [existing] = await tx.select().from(proofs).where(eq(proofs.id, proofId)).limit(1);
          if (existing === undefined) throw notFound("That proof does not exist.");

          return {
            proof: toProof(existing),
            alreadyReviewed: true,
          };
        }

        const [credit] = await tx
          .select()
          .from(pointsLedger)
          .where(and(eq(pointsLedger.proofId, proofId), isNull(pointsLedger.reversalOf)))
          .limit(1);
        if (credit !== undefined) {
          await tx
            .insert(pointsLedger)
            .values({
              userId: credit.userId,
              proofId,
              points: -credit.points,
              awardedAt: credit.awardedAt,
              createdAt: now,
              reversalOf: credit.id,
            })
            .onConflictDoNothing();
        }
        await tx
          .update(proofReports)
          .set({
            resolvedAt: now,
            resolvedBy: reviewerId,
          })
          .where(and(eq(proofReports.proofId, proofId), isNull(proofReports.resolvedAt)));

        return {
          proof: toProof(updated),
          alreadyReviewed: false,
        };
      });
    },

    async report({ proofId, reporterId, reason, now }) {
      const inserted = await db
        .insert(proofReports)
        .values({
          proofId,
          reporterId,
          reason,
          createdAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: proofReports.id });

      return { created: inserted.length > 0 };
    },

    async dismissReports({ proofId, resolvedBy, now }) {
      await db
        .update(proofReports)
        .set({
          resolvedAt: now,
          resolvedBy,
        })
        .where(and(eq(proofReports.proofId, proofId), isNull(proofReports.resolvedAt)));
    },
  };
}
