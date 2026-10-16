import { z } from "zod";
import { photoLimits } from "~/config/photo";

export const proofSchema = z.object({
  taskId: z.string().min(1),
  textAnswer: z.string().trim().max(2000, "Keep your answer under 2000 characters."),
  textMarkdown: z.boolean(),
  objectKeys: z
    .array(z.string().min(1))
    .max(photoLimits.maxPhotosPerProof, `Attach at most ${photoLimits.maxPhotosPerProof} photos.`),
  reviewerIds: z.array(z.uuid()).max(10, "Ask at most 10 reviewers."),
});

export const ownTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Say what you did.")
    .max(120, "Keep the title under 120 characters."),
  description: z.string().trim().max(2000, "Keep the description under 2000 characters."),
  categoryId: z.string().min(1, "Pick a category."),
  points: z
    .number("Enter a number.")
    .int("Points must be a whole number.")
    .min(0, "Points cannot be negative."),
  objectKeys: z
    .array(z.string().min(1))
    .max(photoLimits.maxPhotosPerProof, `Attach at most ${photoLimits.maxPhotosPerProof} photos.`),
  reviewerIds: z.array(z.uuid()).max(10, "Ask at most 10 reviewers."),
});

export type OwnTaskValues = z.infer<typeof ownTaskSchema>;

export type ProofValues = z.infer<typeof proofSchema>;
