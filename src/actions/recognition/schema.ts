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
  label: z
    .string()
    .trim()
    .min(1, "Give the badge a name.")
    .max(60, "Keep the badge name under 60 characters."),
  imageUrl: z
    .union([
      z.literal(""),
      z.url("The image must be a full URL like https://example.com/badge.png.").max(2000),
    ])
    .transform((value) => value || null),
});

export const publishRecognitionSchema = z.object({
  recipientId: z.uuid("Choose a member to recognize."),
  description: z
    .string()
    .trim()
    .min(1, "Describe the contribution.")
    .max(2000, "Keep the description under 2000 characters."),
  descriptionMarkdown: z.boolean(),
  points: z
    .number("Enter a number.")
    .int("Points must be a whole number.")
    .positive("Points must be more than 0.")
    .max(100000, "Points can be at most 100000."),
  badgeIds: z
    .array(z.uuid())
    .max(10, "Choose at most 10 badges.")
    .refine((ids) => new Set(ids).size === ids.length, "Choose each badge only once."),
  links: z.array(linkSchema).max(10, "Add at most 10 achievement links."),
});
