import { userCanViewProfiles } from "~/domain/rules";
import { toPublicUserView } from "~/domain/user";
import { guard } from "../guard";
import type { UserRepository } from "../ports/user";

interface Deps {
  readonly users: UserRepository;
}

export function createUserService({ users }: Deps) {
  return {
    findProfile: guard(userCanViewProfiles, async (_viewer, userId: string) => {
      const user = await users.findById(userId);

      return user === null ? null : toPublicUserView(user);
    }),
  };
}

export type UserService = ReturnType<typeof createUserService>;
