import type { PublicUserView } from "./user";

export interface FeedEntry {
  readonly proofId: string;
  readonly taskTitle: string;
  readonly categoryName: string;
  readonly points: number;
  readonly user: PublicUserView;
  readonly approvedAt: Date;
  readonly photoUrls: ReadonlyArray<string>;
  readonly likeCount: number;
  readonly commentCount: number;

  readonly likedByUser: boolean;
}

export interface FeedComment {
  readonly id: string;
  readonly proofId: string;
  readonly author: PublicUserView;
  readonly body: string;
  readonly createdAt: Date;
  readonly deletedAt: Date | null;
}

export interface FeedCursor {
  readonly approvedAt: Date;
  readonly proofId: string;
}

export interface FeedPage {
  readonly entries: ReadonlyArray<FeedEntry>;
  readonly nextCursor: FeedCursor | null;
}

export function encodeFeedCursor(cursor: FeedCursor): string {
  return Buffer.from(`${cursor.approvedAt.toISOString()}|${cursor.proofId}`).toString("base64url");
}

export function decodeFeedCursor(raw: string | null | undefined): FeedCursor | null {
  if (!raw) {
    return null;
  }
  try {
    const [iso, proofId] = Buffer.from(raw, "base64url").toString("utf8").split("|");
    if (!iso || !proofId) {
      return null;
    }
    const approvedAt = new Date(iso);

    return Number.isNaN(approvedAt.getTime())
      ? null
      : {
          approvedAt,
          proofId,
        };
  } catch {
    return null;
  }
}

export const DELETED_COMMENT_PLACEHOLDER = "[comment removed]";
