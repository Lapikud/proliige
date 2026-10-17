import type { User } from "~/domain/user";

export type UserLookupOptions =
  { readonly includeExcluded: true } | { readonly includeExcluded?: false };

export interface UserRepository {
  upsertFromIdentity(input: {
    ipaUniqueId: string;
    uid: string;
    displayName: string;
    groups: ReadonlyArray<string>;
  }): Promise<User>;

  findById(id: string, options?: UserLookupOptions): Promise<User | null>;

  findByUid(uid: string, options?: UserLookupOptions): Promise<User | null>;

  setExcluded(input: { userId: string; excluded: boolean }): Promise<User | null>;
}
