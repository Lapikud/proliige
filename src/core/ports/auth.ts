import type { User } from "~/domain/user";

export interface AuthenticatedIdentity {
  readonly ipaUniqueId: string;
  readonly uid: string;
  readonly displayName: string;
  readonly groups: ReadonlyArray<string>;
}

export type AuthenticationResult =
  | {
      readonly ok: true;
      readonly identity: AuthenticatedIdentity;
    }
  | {
      readonly ok: false;
      readonly reason: string;
    };

export interface AuthenticationPort {
  authenticate(username: string, password: string): Promise<AuthenticationResult>;
}

export interface SessionPort {
  issue(user: User): Promise<void>;

  current(): Promise<User | null>;
  destroy(): Promise<void>;
}
