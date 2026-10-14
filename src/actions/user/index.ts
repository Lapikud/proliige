"use server";

import { userService } from "~/infra";
import { action } from "~/lib/action";
import { setUserExcludedSchema } from "./schema";

export const setUserExcludedAction = action(
  setUserExcludedSchema,
  async (user, { userId, excluded }) => {
    await userService.setExcluded(user, userId, excluded);
  },
  { revalidate: ["/", "/api/feed", "/api/leaderboard"] },
);
