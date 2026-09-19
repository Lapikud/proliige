function driverError(error: unknown): Record<string, unknown> | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current !== null && current !== undefined; depth += 1) {
    if (typeof current !== "object") {
      return null;
    }
    const candidate = current as Record<string, unknown>;
    if (typeof candidate.code === "string") {
      return candidate;
    }
    current = candidate.cause;
  }

  return null;
}

export function isUniqueViolation(error: unknown): boolean {
  return driverError(error)?.code === "23505";
}

export function violatedConstraint(error: unknown): string | null {
  const driver = driverError(error);
  if (driver === null) {
    return null;
  }
  const name = driver.constraint_name ?? driver.constraint;

  return typeof name === "string" ? name : null;
}
