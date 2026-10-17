import { rolesForGroups, type User } from "~/domain/user";
import type { users } from "./model";

export type UserRow = typeof users.$inferSelect;

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    ipaUniqueId: row.ipaUniqueId,
    uid: row.uid,
    displayName: row.displayName,
    excluded: row.excluded,
    roles: rolesForGroups(row.freeipaGroups),
  };
}
