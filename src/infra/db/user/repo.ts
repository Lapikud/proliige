import { eq } from "drizzle-orm";
import type { UserRepository } from "~/core/ports/user";
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

    async findById(id) {
      const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);

      return row === undefined ? null : toUser(row);
    },
  };
}
