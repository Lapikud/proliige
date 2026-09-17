import { feedConfig } from "~/config/feed";
import { forbidden, notFound, rateLimited, validation } from "~/domain/errors";
import {
  describeCommentFailure,
  isRateLimited,
  normaliseCommentBody,
  rateLimitRetryAt,
  validateCommentBody,
} from "~/domain/comment";
import { userCanDeleteComment, userCanReactToProofs, userCanViewFeed } from "~/domain/rules";
import { guard } from "../guard";
import type { ClockPort } from "../ports/clock";
import type { CommentRepository } from "../ports/comment";
import type { NotificationPort } from "../ports/notification";
import type { ProofRepository } from "../ports/proof";
import { requireApprovedProof } from "./proofGuards";

interface Deps {
  readonly comments: CommentRepository;
  readonly proofs: ProofRepository;
  readonly notifications: NotificationPort;
  readonly clock: ClockPort;
}

export function createCommentService({ comments, proofs, notifications, clock }: Deps) {
  return {
    listComments: guard(userCanViewFeed, (_user, proofId: string) =>
      comments.listComments(proofId),
    ),

    addComment: guard(
      userCanReactToProofs,
      async (
        user,
        input: {
          proofId: string;
          body: string;
        },
      ) => {
        const proof = await requireApprovedProof(proofs, input.proofId);

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

        const earlier = await comments.listComments(input.proofId);
        const comment = await comments.addComment({
          proofId: input.proofId,
          userId: user.id,
          body: normaliseCommentBody(input.body),
          now,
        });

        if (proof.userId !== user.id) {
          await notifications.publish({
            recipientUserId: proof.userId,
            type: "proof_commented",
            title: "New comment",
            message: `${user.displayName} commented on your completed task.`,
            proofId: proof.id,
            taskId: proof.taskId,
          });
        }

        const thread = new Set(
          earlier
            .filter((earlierComment) => earlierComment.deletedAt === null)
            .map((earlierComment) => earlierComment.author.id)
            .filter((authorId) => authorId !== user.id && authorId !== proof.userId),
        );
        await notifications.publishMany(
          [...thread].map((recipientUserId) => ({
            recipientUserId,
            type: "proof_commented" as const,
            title: "New reply",
            message: `${user.displayName} replied in a thread you commented on.`,
            proofId: proof.id,
            taskId: proof.taskId,
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
