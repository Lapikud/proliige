import { z } from "zod";

export const approveSchema = z.object({ proofId: z.string().min(1) });

export const rejectSchema = z.object({
  proofId: z.string().min(1),
  reason: z.string().trim().max(300),
});

export type RejectValues = z.infer<typeof rejectSchema>;
