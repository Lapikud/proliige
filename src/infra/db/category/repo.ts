import { asc, eq } from "drizzle-orm";
import type { CategoryRepository } from "~/core/ports/category";
import { conflict, notFound } from "~/domain/errors";
import type { Category } from "~/domain/task";
import type { Database } from "../client";
import { isUniqueViolation } from "../errors";
import { categories } from "./model";
import { onlyRow } from "../rows";

type Row = typeof categories.$inferSelect;

const toCategory = (row: Row): Category => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
});

export function createCategoryRepository(db: Database): CategoryRepository {
  return {
    async list() {
      const rows = await db.select().from(categories).orderBy(asc(categories.name));

      return rows.map(toCategory);
    },

    async findById(id) {
      const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

      return row === undefined ? null : toCategory(row);
    },

    async create(input) {
      try {
        const row = onlyRow(await db.insert(categories).values(input).returning());

        return toCategory(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw conflict("A category with that name already exists.");
        }
        throw error;
      }
    },

    async update(id, input) {
      try {
        const [row] = await db
          .update(categories)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(categories.id, id))
          .returning();
        if (row === undefined) {
          throw notFound("That category does not exist.");
        }

        return toCategory(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw conflict("A category with that name already exists.");
        }
        throw error;
      }
    },
  };
}
