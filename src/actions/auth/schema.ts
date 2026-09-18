import { z } from "zod";
import type { Credentials } from "~/core/services/auth";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
}) satisfies z.ZodType<Credentials>;

export const logoutSchema = z.object({});

export type LoginValues = z.infer<typeof loginSchema>;
