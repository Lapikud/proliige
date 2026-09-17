import { and, eq } from "drizzle-orm";
import type { ProofRepository } from "~/core/ports/proof";
import { notFound } from "~/domain/errors";
import type { Database } from "../client";
import { isUniqueViolation } from "../errors";
import { pointsLedger } from "../points/model";
import { tasks } from "../task/model";
import { proofs } from "./model";
import { toProof } from "./map";

export function createProofReview(db: Database): Pick<ProofRepository, "approve" | "reject"> {
  return {
    async approve({ proofId, reviewerId, now }) {
      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(proofs)
          .set({
            status: "approved",
            reviewedAt: now,
            reviewedBy: reviewerId,
          })
          .where(and(eq(proofs.id, proofId), eq(proofs.status, "pending")))
          .returning();

        if (updated === undefined) {
          const [existing] = await tx.select().from(proofs).where(eq(proofs.id, proofId)).limit(1);
          if (existing === undefined) {
            throw notFound("That proof does not exist.");
          }

          return {
            proof: toProof(existing),
            alreadyReviewed: true,
            pointsAwarded: 0,
          };
        }

        const [task] = await tx
          .select({ points: tasks.points })
          .from(tasks)
          .where(eq(tasks.id, updated.taskId))
          .limit(1);
        const points = task?.points ?? 0;

        try {
          await tx.insert(pointsLedger).values({
            userId: updated.userId,
            proofId: updated.id,
            points,
            awardedAt: now,
          });
        } catch (error) {
          if (isUniqueViolation(error)) {
            return {
              proof: toProof(updated),
              alreadyReviewed: true,
              pointsAwarded: 0,
            };
          }
          throw error;
        }

        return {
          proof: toProof(updated),
          alreadyReviewed: false,
          pointsAwarded: points,
        };
      });
    },

    async reject({ proofId, reviewerId, reason, now }) {
      const [updated] = await db
        .update(proofs)
        .set({
          status: "rejected",
          reviewedAt: now,
          reviewedBy: reviewerId,
          rejectionReason: reason,
        })
        .where(and(eq(proofs.id, proofId), eq(proofs.status, "pending")))
        .returning();

      if (updated === undefined) {
        const [existing] = await db.select().from(proofs).where(eq(proofs.id, proofId)).limit(1);
        if (existing === undefined) {
          throw notFound("That proof does not exist.");
        }

        return {
          proof: toProof(existing),
          alreadyReviewed: true,
        };
      }

      return {
        proof: toProof(updated),
        alreadyReviewed: false,
      };
    },
  };
}
