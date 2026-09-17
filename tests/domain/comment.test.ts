import { describe, expect, it } from "vitest";
import { feedConfig } from "~/config/feed";
import {
  isRateLimited,
  normaliseCommentBody,
  rateLimitRetryAt,
  validateCommentBody,
} from "~/domain/comment";

describe("validateCommentBody", () => {
  it("accepts ordinary text", () => {
    expect(validateCommentBody("Nice work!")).toBeNull();
  });

  it("rejects an empty or whitespace-only comment", () => {
    expect(validateCommentBody("")?.kind).toBe("empty");
    expect(validateCommentBody("   \n ")?.kind).toBe("empty");
  });

  it("enforces the configured maximum length after trimming", () => {
    const max = feedConfig.maxCommentLength;
    expect(validateCommentBody("x".repeat(max))).toBeNull();
    expect(validateCommentBody("x".repeat(max + 1))?.kind).toBe("too_long");

    expect(validateCommentBody("x".repeat(max) + "   ")).toBeNull();
  });
});

describe("normaliseCommentBody", () => {
  it("trims and normalises line endings, leaving markup as literal text", () => {
    expect(normaliseCommentBody("  **bold**\r\nline  ")).toBe("**bold**\nline");
  });
});

describe("comment rate limiting", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  const { maxComments, windowSeconds } = feedConfig.commentRateLimit;
  const secondsAgo = (s: number) => new Date(now.getTime() - s * 1000);

  it("allows a user who has not hit the limit", () => {
    expect(isRateLimited([secondsAgo(1)], now)).toBe(false);
  });

  it("blocks once the limit is reached inside the window", () => {
    const times = Array.from({ length: maxComments }, (_, i) => secondsAgo(i + 1));
    expect(isRateLimited(times, now)).toBe(true);
  });

  it("ignores comments that fall outside the window", () => {
    const times = Array.from({ length: maxComments }, () => secondsAgo(windowSeconds + 10));
    expect(isRateLimited(times, now)).toBe(false);
  });

  it("reports when the user may comment again", () => {
    const oldest = secondsAgo(windowSeconds - 10);
    const times = [oldest, ...Array.from({ length: maxComments - 1 }, () => secondsAgo(1))];
    const retryAt = rateLimitRetryAt(times, now);
    expect(retryAt?.getTime()).toBe(oldest.getTime() + windowSeconds * 1000);
  });

  it("reports no retry time when the user is not limited", () => {
    expect(rateLimitRetryAt([], now)).toBeNull();
  });
});
