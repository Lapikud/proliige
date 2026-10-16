import { z } from "zod";
import { photoLimits } from "~/config/photo";

export const proofSchema = z.object({
  taskId: z.string().min(1),
  textAnswer: z.string().trim().max(2000),
  textMarkdown: z.boolean(),
  objectKeys: z.array(z.string().min(1)).max(photoLimits.maxPhotosPerProof),
  reviewerIds: z.array(z.uuid()).max(10),
});

export const ownTaskSchema = z.object({
  title: z.string().trim().min(1, "Say what you did.").max(120),
  description: z.string().trim().max(2000),
  categoryId: z.string().min(1, "Pick a category."),
  points: z.number("Enter a number.").int().min(0, "Points cannot be negative."),
  objectKeys: z.array(z.string().min(1)).max(photoLimits.maxPhotosPerProof),
  reviewerIds: z.array(z.uuid()).max(10),
});

export type OwnTaskValues = z.infer<typeof ownTaskSchema>;

export type ProofValues = z.infer<typeof proofSchema>;
