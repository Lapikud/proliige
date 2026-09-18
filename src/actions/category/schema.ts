import { z } from "zod";
import type { CategoryInput } from "~/core/services/category";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Give the category a name.").max(60),
}) satisfies z.ZodType<CategoryInput>;

export const createCategorySchema = z.object({ category: categorySchema });

export const updateCategorySchema = z.object({
  categoryId: z.string().min(1),
  category: categorySchema,
});

export type CategoryValues = z.infer<typeof categorySchema>;
