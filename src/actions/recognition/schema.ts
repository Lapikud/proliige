import { z } from "zod";

const linkSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give each achievement link a title.")
    .max(100, "Keep link titles under 100 characters."),
  url: z.url("Achievement links must be full URLs like https://example.com.").max(2000),
});

export const createRecognitionBadgeSchema = z.object({
  label: z.string().trim().min(1).max(60),
  imageUrl: z.union([z.literal(""), z.url().max(2000)]).transform((value) => value || null),
});

export const publishRecognitionSchema = z.object({
  recipientId: z.uuid(),
  description: z.string().trim().min(1).max(2000),
  descriptionMarkdown: z.boolean(),
  points: z.number().int().positive().max(100000),
  badgeIds: z
    .array(z.uuid())
    .max(10)
    .refine((ids) => new Set(ids).size === ids.length, "Choose each badge only once."),
  links: z.array(linkSchema).max(10),
});
