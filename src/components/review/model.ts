import type { PublicUserView } from "~/domain/user";

export interface PendingProofView {
  proofId: string;
  taskTitle: string;
  categoryName: string;
  points: number;
  userDisplayName: string;
  submittedAt: string;
  photoUrls: Array<string>;
  requestedReviewers: ReadonlyArray<PublicUserView>;
  requestedFromMe: boolean;
}
