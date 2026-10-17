"use server";

import { toCommentView } from "~/components/feed/model";
import { commentService, likeService, proofService } from "~/infra";
import { action } from "~/lib/action";
import { commentSchema, deleteCommentSchema, likeSchema, reportSchema } from "./schema";

export const toggleLikeAction = action(likeSchema, (user, { proofId }) =>
  likeService.toggleLike(user, proofId),
);

export const addCommentAction = action(
  commentSchema,
  async (user, comment) => toCommentView(await commentService.addComment(user, comment), user),
  { revalidate: ["/"] },
);

export const deleteCommentAction = action(
  deleteCommentSchema,
  async (user, { commentId }) => {
    await commentService.deleteComment(user, commentId);
  },
  { revalidate: ["/"] },
);

export const reportPostAction = action(
  reportSchema,
  async (user, { proofId, reason }) => {
    await proofService.reportProof(user, {
      proofId,
      reason,
    });
  },
  { revalidate: ["/admin/review"] },
);
