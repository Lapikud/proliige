import "server-only";
import { forbidden, unauthorized } from "next/navigation";
import { cache } from "react";
import type { Rule } from "~/domain/rules";
import type { User } from "~/domain/user";
import { authService } from "~/infra";

export const getUser = cache((): Promise<User | null> => authService.getUser());

export async function requireUser(rule?: Rule): Promise<User> {
  const user = await getUser();
  if (user === null) {
    unauthorized();
  }
  if (rule && !rule(user)) {
    forbidden();
  }

  return user;
}
