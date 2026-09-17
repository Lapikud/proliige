import type { SQL } from "drizzle-orm";

export function predicate(condition: SQL | undefined): SQL {
  if (condition === undefined) {
    throw new Error("An index predicate needs at least one condition.");
  }

  return condition.inlineParams();
}
