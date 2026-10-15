import { userCanManageCategories, userCanViewFeed } from "~/domain/rules";
import { guard } from "../guard";
import type { CategoryRepository } from "../ports/category";

export interface CategoryInput {
  readonly name: string;
}

interface Deps {
  readonly categories: CategoryRepository;
}

export function createCategoryService({ categories }: Deps) {
  return {
    listCategories: guard(userCanManageCategories, () => categories.list()),

    listFeedCategories: guard(userCanViewFeed, () => categories.list()),

    createCategory: guard(userCanManageCategories, (_user, input: CategoryInput) =>
      categories.create(toNewCategory(input)),
    ),

    updateCategory: guard(
      userCanManageCategories,
      (_user, categoryId: string, input: CategoryInput) =>
        categories.update(categoryId, toNewCategory(input)),
    ),

    deleteCategory: guard(userCanManageCategories, (_user, categoryId: string) =>
      categories.delete(categoryId),
    ),
  };
}

const toNewCategory = ({ name }: CategoryInput) => ({
  name,
  slug: slugify(name),
});

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  let start = 0;
  let end = normalized.length;

  while (start < end && normalized.charCodeAt(start) === 45) start += 1;
  while (end > start && normalized.charCodeAt(end - 1) === 45) end -= 1;

  return normalized.slice(start, end);
}

export type CategoryService = ReturnType<typeof createCategoryService>;
