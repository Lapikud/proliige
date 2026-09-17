import { count, eq } from "drizzle-orm";
import type { ProofRepository } from "~/core/ports/proof";
import { standingOf } from "~/domain/completionPolicy";
import { conflict, notFound, validation } from "~/domain/errors";
import { findRefusal, describeRefusal } from "~/domain/proof";
import type { Database } from "../client";
import { isUniqueViolation, violatedConstraint } from "../errors";
import { tasks } from "../task/model";
import { proofPhotos, proofReviewRequests, proofs } from "./model";
import { toProof, type ProofRow } from "./map";
import { onlyRow } from "../rows";

export function createProofSubmit(db: Database): Pick<ProofRepository, "createPendingProof"> {
  return {
    async createPendingProof({ taskId, userId, photos, reviewerIds = [], now }) {
      return db.transaction(async (tx) => {
        const [task] = await tx
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId))
          .for("update")
          .limit(1);

        if (task === undefined) {
          throw notFound("That task does not exist.");
        }

        const snapshots = await tx
          .select({
            userId: proofs.userId,
            status: proofs.status,
            reviewedAt: proofs.reviewedAt,
          })
          .from(proofs)
          .where(eq(proofs.taskId, taskId));
        // Rechecked here because the task row is locked, so two submissions cannot both pass.
        const refusal = findRefusal({
          policy: task.policy,
          taskArchived: task.archivedAt !== null,
          cooldownSeconds: task.cooldownSeconds,
          now,
          ...standingOf(snapshots, userId),
        });
        if (refusal) {
          throw conflict(describeRefusal(refusal));
        }

        let proofRow: ProofRow;
        try {
          proofRow = onlyRow(
            await tx
              .insert(proofs)
              .values({
                taskId,
                userId,
                policy: task.policy,
                status: "pending",
                submittedAt: now,
              })
              .returning(),
          );
        } catch (error) {
          translateProofConflict(error);
        }

        if (photos.length > 0) {
          await tx.insert(proofPhotos).values(
            photos.map((e) => ({
              proofId: proofRow.id,
              objectKey: e.objectKey,
              contentType: e.contentType,
              sizeBytes: e.sizeBytes,
              uploadedAt: now,
            })),
          );
        }

        if (reviewerIds.length > 0) {
          await tx.insert(proofReviewRequests).values(
            reviewerIds.map((reviewerId) => ({
              proofId: proofRow.id,
              reviewerId,
              requestedAt: now,
            })),
          );
        }

        if (task.photoRequired) {
          const { count: photoCount } = onlyRow(
            await tx
              .select({ count: count() })
              .from(proofPhotos)
              .where(eq(proofPhotos.proofId, proofRow.id)),
          );
          if (photoCount < 1) {
            throw validation("This task requires at least one photo.");
          }
        }

        return toProof(proofRow);
      });
    },
  };
}

const conflictMessages: Record<string, string> = {
  proofs_single_winner_exclusive: "Someone else has already taken this task.",
  proofs_one_pending_per_user: "You already have a proof awaiting review for this task.",
  proofs_one_approved_per_user: "You have already completed this task.",
};

function translateProofConflict(error: unknown): never {
  const message = isUniqueViolation(error)
    ? conflictMessages[violatedConstraint(error) ?? ""]
    : undefined;
  if (message) {
    throw conflict(message);
  }
  throw error;
}
