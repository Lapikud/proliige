import { arrayOverlaps, asc } from "drizzle-orm";
import type { AdminDirectoryPort } from "~/core/ports/notification";
import type { Database } from "../client";
import { users } from "./model";

export function createAdminDirectory(
  db: Database,
  adminGroups: ReadonlyArray<string>,
): AdminDirectoryPort {
  return {
    async listAdmins() {
      if (adminGroups.length === 0) {
        return [];
      }

      return db
        .select({
          id: users.id,
          displayName: users.displayName,
        })
        .from(users)
        .where(arrayOverlaps(users.freeipaGroups, [...adminGroups]))
        .orderBy(asc(users.displayName));
    },
  };
}
