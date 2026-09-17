import type { UserStanding } from "~/domain/completionPolicy";
import type { Proof, ProofPhoto, PhotoRef } from "~/domain/proof";
import type { PublicUserView } from "~/domain/user";

export interface ProofWithContext {
  readonly proof: Proof;
  readonly taskTitle: string;
  readonly taskPoints: number;
  readonly categoryName: string;
  readonly userDisplayName: string;
  readonly photos: ReadonlyArray<ProofPhoto>;
  readonly requestedReviewers: ReadonlyArray<PublicUserView>;
  readonly reviewedByName: string | null;
}

export interface ProofRepository {
  createPendingProof(input: {
    taskId: string;
    userId: string;
    photos: ReadonlyArray<PhotoRef>;
    reviewerIds?: ReadonlyArray<string>;
    now: Date;
  }): Promise<Proof>;

  getStanding(input: { taskId: string; userId: string }): Promise<UserStanding>;

  findById(id: string): Promise<Proof | null>;
  findWithContext(id: string): Promise<ProofWithContext | null>;
  listPending(): Promise<Array<ProofWithContext>>;

  listReviewed(limit?: number): Promise<Array<ProofWithContext>>;
  listForUser(userId: string): Promise<Array<ProofWithContext>>;
  listPhotos(proofId: string): Promise<Array<ProofPhoto>>;

  approve(input: { proofId: string; reviewerId: string; now: Date }): Promise<{
    proof: Proof;
    alreadyReviewed: boolean;
    pointsAwarded: number;
  }>;

  reject(input: {
    proofId: string;
    reviewerId: string;
    reason: string | null;
    now: Date;
  }): Promise<{
    proof: Proof;
    alreadyReviewed: boolean;
  }>;
}
