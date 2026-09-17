import type { Proof, ProofPhoto } from "~/domain/proof";
import { type proofPhotos, type proofs } from "./model";

export type ProofRow = typeof proofs.$inferSelect;

export type PhotoRow = typeof proofPhotos.$inferSelect;

export function toProof(row: ProofRow): Proof {
  return {
    id: row.id,
    taskId: row.taskId,
    userId: row.userId,
    status: row.status,
    rejectionReason: row.rejectionReason,
    submittedAt: row.submittedAt,
    reviewedAt: row.reviewedAt,
    reviewedBy: row.reviewedBy,
  };
}

export function toPhoto(row: PhotoRow): ProofPhoto {
  return {
    id: row.id,
    proofId: row.proofId,
    objectKey: row.objectKey,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    uploadedAt: row.uploadedAt,
  };
}
