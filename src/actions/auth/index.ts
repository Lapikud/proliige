"use server";

import { redirect } from "next/navigation";
import { authService } from "~/infra";
import { action } from "~/lib/action";
import { startPageFor } from "~/lib/navigation";
import { loginSchema, logoutSchema } from "./schema";

export const loginAction = action(loginSchema, async (_user, credentials) => {
  const user = await authService.login(credentials);
  redirect(startPageFor(user));
});

export const logoutAction = action(logoutSchema, async () => {
  await authService.logout();
  redirect("/");
});
