import { forbidden, unauthenticated } from "~/domain/errors";
import type { PublicRule, Rule } from "~/domain/rules";
import type { User } from "~/domain/user";

export function guard<Args extends Array<unknown>, Result>(
  rule: Rule,
  method: (user: User, ...args: Args) => Result | Promise<Result>,
): (user: User | null, ...args: Args) => Promise<Result>;

export function guard<Args extends Array<unknown>, Result>(
  rule: PublicRule,
  method: (user: User | null, ...args: Args) => Result | Promise<Result>,
): (user: User | null, ...args: Args) => Promise<Result>;

export function guard<Args extends Array<unknown>, Result>(
  rule: PublicRule,
  method: (user: User, ...args: Args) => Result | Promise<Result>,
) {
  return async (user: User | null, ...args: Args): Promise<Result> => {
    if (!rule(user)) {
      throw user === null ? unauthenticated() : forbidden();
    }
    // Safe: the overloads only let a PublicRule pass null through to a method that accepts it.
    const call = method as (user: User | null, ...args: Args) => Result | Promise<Result>;

    return call(user, ...args);
  };
}
