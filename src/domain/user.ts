import { accessConfig } from "~/config/access";

export type Role = "member" | "admin";

export interface User {
  readonly id: string;
  readonly ipaUniqueId: string;
  readonly uid: string;
  readonly displayName: string;
  readonly roles: ReadonlyArray<Role>;
}

export interface PublicUserView {
  readonly id: string;
  readonly displayName: string;
}

export const toPublicUserView = ({ id, displayName }: User): PublicUserView => ({
  id,
  displayName,
});

export function hasRole(user: User | null, role: Role): user is User {
  return user?.roles.includes(role) ?? false;
}

export function rolesForGroups(groups: ReadonlyArray<string>, config = accessConfig): Array<Role> {
  const normalised = new Set(groups.map((group) => group.trim().toLowerCase()));
  const inAny = (configured: ReadonlyArray<string>) =>
    configured.some((group) => normalised.has(group.trim().toLowerCase()));

  if (inAny(config.adminGroups)) {
    return ["admin"];
  }
  if (inAny(config.memberGroups)) {
    return ["member"];
  }

  return [];
}
