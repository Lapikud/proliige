import { z } from "zod";
import { feedConfig } from "~/config/feed";

const { maxCommentLength } = feedConfig;

export const likeSchema = z.object({ proofId: z.string().min(1) });

export const commentSchema = z.object({
  proofId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(maxCommentLength, `Keep it under ${maxCommentLength} characters.`),
});

export const reportSchema = z.object({
  proofId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(1, "Say what is wrong with this post.")
    .max(300, "Keep the reason under 300 characters."),
});

export type ReportValues = z.infer<typeof reportSchema>;

export const deleteCommentSchema = z.object({ commentId: z.string().min(1) });

export type CommentValues = z.infer<typeof commentSchema>;
