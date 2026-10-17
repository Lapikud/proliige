import { notFound } from "~/domain/errors";
import {
  userCanExcludeOtherUsers,
  userCanFindProfilesByUsername,
  userCanViewProfiles,
} from "~/domain/rules";
import { toProfileView, type UserProfileView } from "~/domain/user";
import { guard } from "../guard";
import type { UserLookupOptions, UserRepository } from "../ports/user";

interface Deps {
  readonly users: UserRepository;
}

export function createUserService({ users }: Deps) {
  return {
    findProfile: guard(
      userCanViewProfiles,
      async (
        _viewer,
        userId: string,
        options: UserLookupOptions = {},
      ): Promise<UserProfileView | null> => {
        const user = await users.findById(userId, options);

        return user === null ? null : toProfileView(user);
      },
    ),

    findProfileByUid: guard(
      userCanFindProfilesByUsername,
      async (
        _viewer,
        uid: string,
        options: UserLookupOptions = {},
      ): Promise<UserProfileView | null> => {
        const user = await users.findByUid(uid, options);

        return user === null ? null : toProfileView(user);
      },
    ),

    setExcluded: guard(
      userCanExcludeOtherUsers,
      async (_admin, userId: string, excluded: boolean): Promise<UserProfileView> => {
        const profile = await users.setExcluded({
          userId,
          excluded,
        });
        if (profile === null) throw notFound("That user does not exist.");

        return toProfileView(profile);
      },
    ),
  };
}

export type UserService = ReturnType<typeof createUserService>;
