import type { FeedComment } from "~/domain/feed";

export interface CommentRepository {
  listComments(proofId: string): Promise<Array<FeedComment>>;

  addComment(input: {
    proofId: string;
    userId: string;
    body: string;
    now: Date;
  }): Promise<FeedComment>;

  recentCommentTimes(userId: string, since: Date): Promise<Array<Date>>;

  findComment(id: string): Promise<(FeedComment & { userId: string }) | null>;

  softDeleteComment(id: string, now: Date): Promise<void>;
}
