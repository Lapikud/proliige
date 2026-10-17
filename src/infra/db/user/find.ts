import { and, eq, type SQL } from "drizzle-orm";
import type { UserLookupOptions } from "~/core/ports/user";
import type { User } from "~/domain/user";
import type { Database } from "../client";
import { toUser } from "./map";
import { users } from "./model";

export async function findUser(
  db: Database,
  condition: SQL,
  options: UserLookupOptions,
): Promise<User | null> {
  const conditions = [condition];
  const applyPublicVisibilityFilter = options.includeExcluded !== true;
  if (applyPublicVisibilityFilter) {
    conditions.push(eq(users.excluded, false));
  }

  const [row] = await db
    .select()
    .from(users)
    .where(and(...conditions))
    .limit(1);

  return row === undefined ? null : toUser(row);
}
