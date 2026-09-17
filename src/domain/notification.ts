export type NotificationType =
  "proof_submitted" | "review_requested" | "proof_approved" | "proof_rejected" | "proof_commented";

export interface Notification {
  readonly id: string;
  readonly recipientUserId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly proofId: string | null;
  readonly taskId: string | null;
  readonly createdAt: Date;
  readonly readAt: Date | null;
}

export interface NewNotification {
  readonly recipientUserId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly proofId?: string | null;
  readonly taskId?: string | null;
}

export function isUnread(notification: Pick<Notification, "readAt">): boolean {
  return notification.readAt === null;
}
