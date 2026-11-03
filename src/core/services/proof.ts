import { photoLimits } from "~/config/photo";
import {
  findRefusal,
  describeRefusal,
  isOnFeed,
  type PhotoRef,
  type ProofFilters,
} from "~/domain/proof";
import { conflict, notFound, validation } from "~/domain/errors";
import { objectKeyBelongsToUser } from "~/domain/photo";
import {
  userCanAddOwnTask,
  userCanModeratePosts,
  userCanReportPosts,
  userCanReviewProofs,
  userCanSubmitProof,
} from "~/domain/rules";
import { guard } from "../guard";
import type { OwnTaskEdit, ProofRepository } from "../ports/proof";
import type { ClockPort } from "../ports/clock";
import type { AdminDirectoryPort, NotificationPort } from "../ports/notification";
import type { TaskRepository } from "../ports/task";
import type { PhotoService } from "./photo";

export interface ProofServiceDeps {
  readonly proofs: ProofRepository;
  readonly tasks: TaskRepository;
  readonly photos: PhotoService;
  readonly notifications: NotificationPort;
  readonly admins: AdminDirectoryPort;
  readonly clock: ClockPort;
}

export function createProofService({
  proofs,
  tasks,
  photos,
  notifications,
  admins,
  clock,
}: ProofServiceDeps) {
  const submitProof = guard(
    userCanSubmitProof,
    async (
      user,
      input: {
        taskId: string;
        textAnswer?: string;
        textMarkdown?: boolean;
        objectKeys: ReadonlyArray<string>;
        reviewerIds?: ReadonlyArray<string>;
      },
    ) => {
      const task = await tasks.findById(input.taskId);
      if (task === null) {
        throw notFound("That task does not exist.");
      }

      // Fails fast before checking photos in storage; the repository checks again under a row lock.
      const facts = await proofs.getStanding({
        taskId: task.id,
        userId: user.id,
      });
      const refusal = findRefusal({
        policy: task.policy,
        taskArchived: task.archivedAt !== null || task.suggestionPending,
        cooldownSeconds: task.cooldownSeconds,
        now: clock.now(),
        ...facts,
      });
      if (refusal !== null) {
        throw conflict(describeRefusal(refusal));
      }

      const adminList = await admins.listAdmins();
      const reviewerIds = [...new Set(input.reviewerIds ?? [])];
      const adminIds = new Set(adminList.map((admin) => admin.id));
      if (reviewerIds.some((id) => !adminIds.has(id))) {
        throw validation("Reviews can only be requested from admins.");
      }

      const objectKeys = [...new Set(input.objectKeys)];
      let verified: ReadonlyArray<PhotoRef> = [];

      if (task.photoRequired && objectKeys.length === 0) {
        throw validation("This task requires at least one photo.");
      }
      if (objectKeys.length > 0) {
        if (objectKeys.length > photoLimits.maxPhotosPerProof) {
          throw validation(`Attach at most ${photoLimits.maxPhotosPerProof} photos.`);
        }
        for (const key of objectKeys) {
          if (!objectKeyBelongsToUser(key, user.id)) {
            throw validation("That upload does not belong to you.");
          }
        }
        verified = await photos.verifyPhotos(objectKeys);
      }

      const textAnswer = input.textAnswer?.trim() ?? "";
      if (task.textRequired && textAnswer.length === 0) {
        throw validation("This task requires a written answer.");
      }

      const proof = await proofs.createPendingProof({
        taskId: task.id,
        userId: user.id,
        photos: verified,
        textAnswer: textAnswer || null,
        textMarkdown: input.textMarkdown ?? false,
        reviewerIds,
        now: clock.now(),
      });

      await notifications.publishMany(
        reviewerIds.map((recipientUserId) => ({
          recipientUserId,
          type: "review_requested" as const,
          title: "Review requested",
          message: `${user.displayName} asked you to review "${task.title}".`,
          proofId: proof.id,
          taskId: task.id,
        })),
      );

      return proof;
    },
  );

  return {
    listReviewers: guard(userCanSubmitProof, () => admins.listAdmins()),

    submitProof,

    addOwnTask: guard(
      userCanAddOwnTask,
      async (
        user,
        input: {
          title: string;
          description: string;
          categoryId: string;
          points: number;
          objectKeys: ReadonlyArray<string>;
          reviewerIds: ReadonlyArray<string>;
        },
      ) => {
        const task = await tasks.create({
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          points: input.points,
          policy: "single_winner",
          cooldownSeconds: null,
          photoRequired: input.objectKeys.length > 0,
          photoInstructions: null,
          textRequired: false,
          createdBy: user.id,
        });
        try {
          return await submitProof(user, {
            taskId: task.id,
            objectKeys: input.objectKeys,
            reviewerIds: input.reviewerIds,
          });
        } catch (error) {
          await tasks.remove(task.id);
          throw error;
        }
      },
    ),

    listMyProofs: guard(userCanSubmitProof, (user) => proofs.listForUser(user.id)),

    listPendingProofs: guard(userCanReviewProofs, (_user, filters?: ProofFilters) =>
      proofs.listPending(filters),
    ),

    listReviewedProofs: guard(
      userCanReviewProofs,
      (_user, limit?: number, filters?: ProofFilters) => proofs.listReviewed(limit ?? 100, filters),
    ),

    approveProof: guard(userCanReviewProofs, async (user, proofId: string, edit?: OwnTaskEdit) => {
      const context = await proofs.findWithContext(proofId);
      if (context === null) {
        throw notFound("That proof does not exist.");
      }
      if (edit !== undefined && !context.ownTask) {
        throw validation("Only own tasks can be changed on review.");
      }

      const result = await proofs.approve({
        proofId,
        reviewerId: user.id,
        ...(edit && { edit }),
        now: clock.now(),
      });
      if (!result.alreadyReviewed) {
        await notifications.publish({
          recipientUserId: result.proof.userId,
          type: "proof_approved",
          title: "Proof approved",
          message: `"${edit?.title ?? context.taskTitle}" was approved. You earned ${result.pointsAwarded} points.`,
          proofId: result.proof.id,
          taskId: result.proof.taskId,
        });
      }

      return result;
    }),

    rejectProof: guard(
      userCanReviewProofs,
      async (
        user,
        input: {
          proofId: string;
          reason: string | null;
        },
      ) => {
        const context = await proofs.findWithContext(input.proofId);
        if (context === null) {
          throw notFound("That proof does not exist.");
        }

        const trimmed = input.reason?.trim();
        const reason = trimmed === undefined || trimmed === "" ? null : trimmed;
        const result = await proofs.reject({
          proofId: input.proofId,
          reviewerId: user.id,
          reason,
          now: clock.now(),
        });
        if (!result.alreadyReviewed) {
          if (context.ownTask) {
            await tasks.setArchived(result.proof.taskId, true);
          }
          await notifications.publish({
            recipientUserId: result.proof.userId,
            type: "proof_rejected",
            title: "Proof rejected",
            message:
              [`"${context.taskTitle}" was rejected`, reason].filter(Boolean).join(": ") + ".",
            proofId: result.proof.id,
            taskId: result.proof.taskId,
          });
        }

        return result;
      },
    ),

    listReportedProofs: guard(userCanModeratePosts, (_user, filters?: ProofFilters) =>
      proofs.listReported(filters),
    ),

    setProofHidden: guard(userCanModeratePosts, (user, proofId: string, hidden: boolean) =>
      proofs.setHidden({
        proofId,
        hidden,
        hiddenBy: user.id,
        now: clock.now(),
      }),
    ),

    unapproveProof: guard(
      userCanModeratePosts,
      async (
        user,
        input: {
          proofId: string;
          reason: string | null;
        },
      ) => {
        const context = await proofs.findWithContext(input.proofId);
        if (context === null) {
          throw notFound("That proof does not exist.");
        }

        const reason = input.reason?.trim();
        const result = await proofs.unapprove({
          proofId: input.proofId,
          reviewerId: user.id,
          reason: reason ? `Unapproved: ${reason}` : "Unapproved",
          now: clock.now(),
        });
        if (!result.alreadyReviewed) {
          if (context.ownTask) {
            await tasks.setArchived(result.proof.taskId, true);
          }
          await notifications.publish({
            recipientUserId: result.proof.userId,
            type: "proof_rejected",
            title: "Proof unapproved",
            message:
              [`"${context.taskTitle}" was unapproved and its points were taken back`, reason]
                .filter(Boolean)
                .join(": ") + ".",
            proofId: result.proof.id,
            taskId: result.proof.taskId,
          });
        }

        return result;
      },
    ),

    reportProof: guard(
      userCanReportPosts,
      async (
        user,
        input: {
          proofId: string;
          reason: string;
        },
      ) => {
        const context = await proofs.findWithContext(input.proofId);
        if (context === null || !isOnFeed(context.proof, { showOnFeed: context.taskShowOnFeed })) {
          throw notFound("That post is not on the feed.");
        }

        const result = await proofs.report({
          proofId: input.proofId,
          reporterId: user.id,
          reason: input.reason.trim(),
          now: clock.now(),
        });
        if (result.created) {
          const recipients = (await admins.listAdmins()).filter(({ id }) => id !== user.id);
          await notifications.publishMany(
            recipients.map(({ id }) => ({
              recipientUserId: id,
              type: "proof_reported" as const,
              title: "Post reported",
              message: `${user.displayName} reported "${context.taskTitle}" by ${context.userDisplayName}.`,
              proofId: context.proof.id,
              taskId: context.proof.taskId,
            })),
          );
        }

        return result;
      },
    ),

    dismissReports: guard(userCanModeratePosts, (user, proofId: string) =>
      proofs.dismissReports({
        proofId,
        resolvedBy: user.id,
        now: clock.now(),
      }),
    ),
  };
}

export type ProofService = ReturnType<typeof createProofService>;
