import { eq } from "drizzle-orm";
import type { UserLookupOptions, UserRepository } from "~/core/ports/user";
import type { User } from "~/domain/user";
import type { Database } from "../client";
import { findUser } from "./find";
import { toUser } from "./map";
import { users } from "./model";
import { onlyRow } from "../rows";

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

    findById(id: string, options: UserLookupOptions = {}): Promise<User | null> {
      return findUser(db, eq(users.id, id), options);
    },

    findByUid(uid: string, options: UserLookupOptions = {}): Promise<User | null> {
      return findUser(db, eq(users.uid, uid), options);
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
