import { unauthenticated } from "~/domain/errors";
import type { User } from "~/domain/user";
import type { AuthenticationPort, SessionPort } from "../ports/auth";
import type { UserRepository } from "../ports/user";

export interface Credentials {
  readonly username: string;
  readonly password: string;
}

export interface AuthServiceDeps {
  readonly authentication: AuthenticationPort;
  readonly session: SessionPort;
  readonly users: UserRepository;
}

export function createAuthService(deps: AuthServiceDeps) {
  return {
    async login({ username, password }: Credentials): Promise<User> {
      const result = await deps.authentication.authenticate(username, password);
      if (!result.ok) {
        throw unauthenticated(result.reason);
      }

      const user = await deps.users.upsertFromIdentity({
        ipaUniqueId: result.identity.ipaUniqueId,
        uid: result.identity.uid,
        displayName: result.identity.displayName,
        groups: result.identity.groups,
      });

      await deps.session.issue(user);

      return user;
    },

    async logout(): Promise<void> {
      await deps.session.destroy();
    },

    async getUser(): Promise<User | null> {
      return deps.session.current();
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
