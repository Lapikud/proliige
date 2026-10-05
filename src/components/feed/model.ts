import { z } from "zod";
import type { FeedComment, FeedEntry } from "~/domain/feed";
import { userCanDeleteComment } from "~/domain/rules";
import type { User } from "~/domain/user";

export type FeedEntryView = Omit<FeedEntry, "approvedAt"> & {
  approvedAt: string;
};

export const commentViewSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
  deleted: z.boolean(),
  deletable: z.boolean(),
});

export type CommentView = z.infer<typeof commentViewSchema>;

export const commentsResponseSchema = z.object({
  comments: z.array(commentViewSchema),
});

export const toFeedEntryView = (entry: FeedEntry): FeedEntryView => ({
  ...entry,
  approvedAt: entry.approvedAt.toISOString(),
});

export const toCommentView = (comment: FeedComment, user: User | null): CommentView => ({
  id: comment.id,
  authorId: comment.author.id,
  authorName: comment.author.displayName,
  body: comment.body,
  createdAt: comment.createdAt.toISOString(),
  deleted: comment.deletedAt !== null,
  deletable:
    comment.deletedAt === null && userCanDeleteComment(user, { userId: comment.author.id }),
});
