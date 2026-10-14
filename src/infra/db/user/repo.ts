import { and, eq } from "drizzle-orm";
import type { UserLookupOptions, UserRepository } from "~/core/ports/user";
import { rolesForGroups, type User } from "~/domain/user";
import type { Database } from "../client";
import { users } from "./model";
import { onlyRow } from "../rows";

type Row = typeof users.$inferSelect;

function toUser(row: Row): User {
  return {
    id: row.id,
    ipaUniqueId: row.ipaUniqueId,
    uid: row.uid,
    displayName: row.displayName,
    excluded: row.excluded,
    roles: rolesForGroups(row.freeipaGroups),
  };
}

export function createUserRepository(db: Database): UserRepository {
  return {
    async upsertFromIdentity(input) {
      const row = onlyRow(
        await db
          .insert(users)
          .values({
            ipaUniqueId: input.ipaUniqueId,
            uid: input.uid,
            displayName: input.displayName,
            freeipaGroups: [...input.groups],
            lastSeenAt: new Date(),
          })

          .onConflictDoUpdate({
            target: users.ipaUniqueId,
            set: {
              uid: input.uid,
              displayName: input.displayName,
              freeipaGroups: [...input.groups],
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            },
          })
          .returning(),
      );

      return toUser(row);
    },

    async findById(id: string, options: UserLookupOptions = {}): Promise<User | null> {
      const conditions = [eq(users.id, id)];
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
    },

    async setExcluded({ userId, excluded }) {
      const [row] = await db
        .update(users)
        .set({
          excluded,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      return row === undefined ? null : toUser(row);
    },
  };
}
