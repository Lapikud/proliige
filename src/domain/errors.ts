export type DomainErrorCode =
  "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "RATE_LIMITED";

export class DomainError extends Error {
  override readonly name = "DomainError";
  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const unauthenticated = (m = "Authentication required.") =>
  new DomainError("UNAUTHENTICATED", m);
export const forbidden = (m = "You are not allowed to do that.") => new DomainError("FORBIDDEN", m);
export const notFound = (m = "Not found.") => new DomainError("NOT_FOUND", m);
export const validation = (m: string, details?: Record<string, unknown>) =>
  new DomainError("VALIDATION", m, details);
export const conflict = (m: string, details?: Record<string, unknown>) =>
  new DomainError("CONFLICT", m, details);
export const rateLimited = (m: string, details?: Record<string, unknown>) =>
  new DomainError("RATE_LIMITED", m, details);

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
