import type { FeedComment, PostRef } from "~/domain/feed";

export interface CommentRepository {
  listComments(post: PostRef): Promise<Array<FeedComment>>;

  addComment(input: {
    post: PostRef;
    userId: string;
    body: string;
    now: Date;
  }): Promise<FeedComment>;

  recentCommentTimes(userId: string, since: Date): Promise<Array<Date>>;

  findComment(id: string): Promise<(FeedComment & { userId: string }) | null>;

  softDeleteComment(id: string, now: Date): Promise<void>;
}
