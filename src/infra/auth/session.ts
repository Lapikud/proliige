import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "~/env.config";
import type { SessionPort } from "~/core/ports/auth";
import type { UserRepository } from "~/core/ports/user";
import type { User } from "~/domain/user";

const sessionPayload = z.object({
  sub: z.string(),
  iat: z.number(),
});

type SessionPayload = z.infer<typeof sessionPayload>;

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function encode(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${body}.${sign(body, secret)}`;
}

function decode(token: string, secret: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = sign(body, secret);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);

  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return null;
  }

  try {
    const parsed = sessionPayload.safeParse(
      JSON.parse(Buffer.from(body, "base64url").toString("utf8")),
    );

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createCookieSession(users: UserRepository): SessionPort {
  return {
    async issue(user: User) {
      const store = await cookies();
      const payload: SessionPayload = {
        sub: user.id,
        iat: Math.floor(Date.now() / 1000),
      };
      store.set(env.SESSION_COOKIE_NAME, encode(payload, env.SESSION_SECRET), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: env.SESSION_TTL_SECONDS,
      });
    },

    async current(): Promise<User | null> {
      const store = await cookies();
      const token = store.get(env.SESSION_COOKIE_NAME)?.value;
      if (token === undefined) {
        return null;
      }

      const payload = decode(token, env.SESSION_SECRET);
      if (payload === null) {
        return null;
      }

      const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat;
      if (ageSeconds > env.SESSION_TTL_SECONDS) {
        return null;
      }

      return users.findById(payload.sub);
    },

    async destroy() {
      const store = await cookies();
      store.delete(env.SESSION_COOKIE_NAME);
    },
  };
}
