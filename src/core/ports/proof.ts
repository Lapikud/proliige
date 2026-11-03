import type { UserStanding } from "~/domain/completionPolicy";
import type { Proof, ProofFilters, ProofPhoto, ProofReport, PhotoRef } from "~/domain/proof";
import type { TaskPolicy } from "~/domain/task";
import type { PublicUserView } from "~/domain/user";

export interface ProofWithContext {
  readonly proof: Proof;
  readonly taskTitle: string;
  readonly proofPolicy: TaskPolicy;
  readonly taskDescription: string;
  readonly ownTask: boolean;
  readonly categoryId: string;
  readonly taskPoints: number;
  readonly taskRemoved: boolean;
  readonly taskRemovedAt: Date | null;
  readonly taskRemovedByName: string | null;
  readonly pointsReversed: boolean;
  readonly pointsAwardedAt: Date | null;
  readonly pointsReversedAt: Date | null;
  readonly categoryName: string;
  readonly userDisplayName: string;
  readonly photos: ReadonlyArray<ProofPhoto>;
  readonly requestedReviewers: ReadonlyArray<PublicUserView>;
  readonly reviewedByName: string | null;
  readonly taskShowOnFeed: boolean;
  readonly openReports: ReadonlyArray<ProofReport>;
}

export interface OwnTaskEdit {
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly categoryId?: string | undefined;
  readonly points?: number | undefined;
}

export interface ProofRepository {
  createPendingProof(input: {
    taskId: string;
    userId: string;
    photos: ReadonlyArray<PhotoRef>;
    textAnswer?: string | null;
    textMarkdown?: boolean;
    reviewerIds?: ReadonlyArray<string>;
    now: Date;
  }): Promise<Proof>;

  getStanding(input: { taskId: string; userId: string }): Promise<UserStanding>;

  findById(id: string): Promise<Proof | null>;
  findForFeed(id: string): Promise<{ proof: Proof; taskShowOnFeed: boolean } | null>;
  findWithContext(id: string): Promise<ProofWithContext | null>;
  listPending(filters?: ProofFilters): Promise<Array<ProofWithContext>>;

  listReviewed(limit?: number, filters?: ProofFilters): Promise<Array<ProofWithContext>>;
  listForUser(userId: string): Promise<Array<ProofWithContext>>;
  listPhotos(proofId: string): Promise<Array<ProofPhoto>>;

  approve(input: { proofId: string; reviewerId: string; edit?: OwnTaskEdit; now: Date }): Promise<{
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

  listReported(filters?: ProofFilters): Promise<Array<ProofWithContext>>;

  setHidden(input: {
    proofId: string;
    hidden: boolean;
    hiddenBy: string;
    now: Date;
  }): Promise<Proof>;

  unapprove(input: { proofId: string; reviewerId: string; reason: string; now: Date }): Promise<{
    proof: Proof;
    alreadyReviewed: boolean;
  }>;

  report(input: { proofId: string; reporterId: string; reason: string; now: Date }): Promise<{
    created: boolean;
  }>;

  dismissReports(input: { proofId: string; resolvedBy: string; now: Date }): Promise<void>;
}
