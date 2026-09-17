import type { Category } from "~/domain/task";

export interface CategoryRepository {
  list(): Promise<Array<Category>>;
  findById(id: string): Promise<Category | null>;
  create(input: { name: string; slug: string }): Promise<Category>;
  update(
    id: string,
    input: {
      name: string;
      slug: string;
    },
  ): Promise<Category>;
}
