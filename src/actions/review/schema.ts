import { z } from "zod";

export const approveSchema = z.object({
  proofId: z.string().min(1),
  points: z
    .number("Enter a number.")
    .int("Points must be a whole number.")
    .min(0, "Points cannot be negative.")
    .optional(),
});

export const rejectSchema = z.object({
  proofId: z.string().min(1),
  reason: z.string().trim().max(300, "Keep the reason under 300 characters."),
});

export const setProofHiddenSchema = z.object({
  proofId: z.uuid(),
  hidden: z.boolean(),
});

export const unapproveSchema = rejectSchema;

export const dismissReportsSchema = z.object({ proofId: z.uuid() });

export type RejectValues = z.infer<typeof rejectSchema>;
