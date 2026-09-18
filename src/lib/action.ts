import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { isDomainError } from "~/domain/errors";
import type { User } from "~/domain/user";
import { getUser } from "./user";
import { logger } from "~/lib/logging/server";

export type ActionResult<T = void> =
  | {
      readonly ok: true;
      readonly data: T;
    }
  | {
      readonly ok: false;
      readonly error: string;
      readonly fieldErrors?: Readonly<Record<string, string>>;
    };

interface ActionOptions {
  readonly name?: string;
  readonly revalidate?: ReadonlyArray<string>;
}

export function action<Schema extends z.ZodType, Result = void>(
  schema: Schema,
  handler: (user: User | null, input: z.output<Schema>) => Promise<Result>,
  options: ActionOptions = {},
) {
  return async (input: z.input<Schema>): Promise<ActionResult<Result>> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return invalid(parsed.error);
    }

    try {
      const data = await handler(await getUser(), parsed.data);
      for (const path of options.revalidate ?? []) {
        revalidatePath(path);
      }

      return {
        ok: true,
        data,
      };
    } catch (error) {
      if (isDomainError(error)) {
        return {
          ok: false,
          error: error.message,
        };
      }
      unstable_rethrow(error);
      logger.error("action.unhandled_error", error, {
        action: options.name ?? (handler.name || "anonymous"),
      });
      throw error;
    }
  };
}

function invalid(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".");
    fieldErrors[field] ??= issue.message;
  }

  return {
    ok: false,
    error: "Check the highlighted fields.",
    fieldErrors,
  };
}
