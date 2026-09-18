"use server";

import { categoryService } from "~/infra";
import { action } from "~/lib/action";
import { createCategorySchema, updateCategorySchema } from "./schema";

const revalidate = ["/admin/categories", "/admin/tasks"];

export const createCategoryAction = action(
  createCategorySchema,
  async (user, { category }) => {
    await categoryService.createCategory(user, category);
  },
  { revalidate },
);

export const updateCategoryAction = action(
  updateCategorySchema,
  async (user, { categoryId, category }) => {
    await categoryService.updateCategory(user, categoryId, category);
  },
  { revalidate },
);
