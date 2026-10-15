import { z } from "zod";

export const approveSchema = z.object({
  proofId: z.string().min(1),
  points: z.number("Enter a number.").int().min(0, "Points cannot be negative.").optional(),
});

export const rejectSchema = z.object({
  proofId: z.string().min(1),
  reason: z.string().trim().max(300),
});

export type RejectValues = z.infer<typeof rejectSchema>;
