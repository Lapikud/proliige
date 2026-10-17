import { eq } from "drizzle-orm";
import type { AuthenticationPort } from "~/core/ports/auth";
import type { Database } from "../db/client";
import { users } from "../db/user/model";

export const seedPassword = "seed";

export function createSeedAuthentication(db: Database): AuthenticationPort {
  return {
    async authenticate(username, password) {
      if (process.env.NODE_ENV === "production") {
        return {
          ok: false,
          reason: "Seed sign-in is disabled in production.",
        };
      }
      const [user] = await db
        .select({
          ipaUniqueId: users.ipaUniqueId,
          uid: users.uid,
          displayName: users.displayName,
          groups: users.freeipaGroups,
        })
        .from(users)
        .where(eq(users.ipaUniqueId, `seed-${username.trim()}`))
        .limit(1);
      if (user === undefined || password !== seedPassword) {
        return {
          ok: false,
          reason: "Use a seed account, such as seed-pixel-1, with the password seed.",
        };
      }

      return {
        ok: true,
        identity: user,
      };
    },
  };
}
