import type { PublicUserView } from "~/domain/user";

export interface PendingProofView {
  proofId: string;
  taskTitle: string;
  taskDescription: string;
  ownTask: boolean;
  categoryName: string;
  points: number;
  userDisplayName: string;
  submittedAt: string;
  textAnswer: string | null;
  textMarkdown: boolean;
  photoUrls: Array<string>;
  requestedReviewers: ReadonlyArray<PublicUserView>;
  requestedFromMe: boolean;
}
