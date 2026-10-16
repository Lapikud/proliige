import { feedConfig } from "~/config/feed";
import {
  describeCommentFailure,
  isRateLimited,
  normaliseCommentBody,
  rateLimitRetryAt,
  validateCommentBody,
} from "~/domain/comment";
import { forbidden, notFound, rateLimited, validation } from "~/domain/errors";
import { userCanDeleteComment, userCanReactToProofs, userCanViewFeed } from "~/domain/rules";
import { guard } from "../guard";
import type { ClockPort } from "../ports/clock";
import type { CommentRepository } from "../ports/comment";
import type { NotificationPort } from "../ports/notification";
import type { ProofRepository } from "../ports/proof";
import type { RecognitionRepository } from "../ports/recognition";
import { requirePost } from "./proofGuards";

interface Deps {
  readonly comments: CommentRepository;
  readonly proofs: ProofRepository;
  readonly recognitions: RecognitionRepository;
  readonly notifications: NotificationPort;
  readonly clock: ClockPort;
}

export function createCommentService({
  comments,
  proofs,
  recognitions,
  notifications,
  clock,
}: Deps) {
  return {
    listComments: guard(userCanViewFeed, async (_user, proofId: string) => {
      const { post } = await requirePost(proofs, recognitions, proofId);

      return comments.listComments(post);
    }),

    addComment: guard(
      userCanReactToProofs,
      async (
        user,
        input: {
          proofId: string;
          body: string;
        },
      ) => {
        const { post, ownerId, taskId } = await requirePost(proofs, recognitions, input.proofId);
        const proofId = post.kind === "proof" ? post.id : null;

        const failure = validateCommentBody(input.body);
        if (failure !== null) {
          throw validation(describeCommentFailure(failure));
        }

        const now = clock.now();
        const windowStart = new Date(
          now.getTime() - feedConfig.commentRateLimit.windowSeconds * 1000,
        );
        const recent = await comments.recentCommentTimes(user.id, windowStart);
        if (isRateLimited(recent, now)) {
          throw rateLimited("You're commenting too quickly. Try again shortly.", {
            retryAt: rateLimitRetryAt(recent, now)?.toISOString(),
          });
        }

        const earlier = await comments.listComments(post);
        const comment = await comments.addComment({
          post,
          userId: user.id,
          body: normaliseCommentBody(input.body),
          now,
        });

        if (ownerId !== user.id) {
          await notifications.publish({
            recipientUserId: ownerId,
            type: "proof_commented",
            title: "New comment",
            message: `${user.displayName} commented on your ${post.kind === "proof" ? "completed task" : "recognition"}.`,
            proofId,
            taskId,
          });
        }

        const thread = new Set(
          earlier
            .filter((earlierComment) => earlierComment.deletedAt === null)
            .map((earlierComment) => earlierComment.author.id)
            .filter((authorId) => authorId !== user.id && authorId !== ownerId),
        );
        await notifications.publishMany(
          [...thread].map((recipientUserId) => ({
            recipientUserId,
            type: "proof_commented" as const,
            title: "New reply",
            message: `${user.displayName} replied in a thread you commented on.`,
            proofId,
            taskId,
          })),
        );

        return comment;
      },
    ),

    deleteComment: guard(userCanReactToProofs, async (user, commentId: string) => {
      const comment = await comments.findComment(commentId);
      if (comment?.deletedAt !== null) {
        throw notFound("That comment does not exist.");
      }
      if (!userCanDeleteComment(user, comment)) {
        throw forbidden("You can only delete your own comments.");
      }
      await comments.softDeleteComment(commentId, clock.now());
    }),
  };
}

export type CommentService = ReturnType<typeof createCommentService>;
