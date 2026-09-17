import { feedConfig } from "~/config/feed";

export type CommentValidationFailure =
  | { kind: "empty" }
  | {
      kind: "too_long";
      length: number;
      maxLength: number;
    };

export function validateCommentBody(raw: string): CommentValidationFailure | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { kind: "empty" };
  }
  if (trimmed.length > feedConfig.maxCommentLength) {
    return {
      kind: "too_long",
      length: trimmed.length,
      maxLength: feedConfig.maxCommentLength,
    };
  }

  return null;
}

export function describeCommentFailure(failure: CommentValidationFailure): string {
  return failure.kind === "empty"
    ? "Write something first."
    : `Comments are limited to ${failure.maxLength} characters.`;
}

export function normaliseCommentBody(raw: string): string {
  return raw.trim().replaceAll("\r\n", "\n");
}

export function isRateLimited(
  recentCommentTimes: ReadonlyArray<Date>,
  now: Date,
  limit = feedConfig.commentRateLimit,
): boolean {
  const windowStart = now.getTime() - limit.windowSeconds * 1000;
  const withinWindow = recentCommentTimes.filter((t) => t.getTime() >= windowStart);

  return withinWindow.length >= limit.maxComments;
}

export function rateLimitRetryAt(
  recentCommentTimes: ReadonlyArray<Date>,
  now: Date,
  limit = feedConfig.commentRateLimit,
): Date | null {
  if (!isRateLimited(recentCommentTimes, now, limit)) {
    return null;
  }
  const windowStart = now.getTime() - limit.windowSeconds * 1000;
  const withinWindow = recentCommentTimes
    .filter((t) => t.getTime() >= windowStart)
    .sort((a, b) => a.getTime() - b.getTime());
  const [oldest] = withinWindow;

  return oldest ? new Date(oldest.getTime() + limit.windowSeconds * 1000) : null;
}
