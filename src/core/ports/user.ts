import type { User } from "~/domain/user";

export interface UserRepository {
  upsertFromIdentity(input: {
    ipaUniqueId: string;
    uid: string;
    displayName: string;
    groups: ReadonlyArray<string>;
  }): Promise<User>;

  findById(id: string): Promise<User | null>;
}
