import type { PublicUserView } from "~/domain/user";

export interface PendingProofView {
  proofId: string;
  taskTitle: string;
  taskDescription: string;
  ownTask: boolean;
  categoryId: string;
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

export interface ReportedProofView {
  proofId: string;
  taskTitle: string;
  categoryName: string;
  points: number;
  userDisplayName: string;
  textAnswer: string | null;
  textMarkdown: boolean;
  photoUrls: Array<string>;
  hidden: boolean;
  reports: Array<{
    reporterId: string;
    reporterName: string;
    reason: string;
    createdAt: string;
  }>;
}
