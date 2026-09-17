import { describe, expect, it } from "vitest";
import { decodeFeedCursor, encodeFeedCursor } from "~/domain/feed";

describe("feed cursor", () => {
  it("round-trips an approval timestamp and proof id", () => {
    const cursor = {
      approvedAt: new Date("2026-09-18T12:34:56.789Z"),
      proofId: "proof-1",
    };
    const decoded = decodeFeedCursor(encodeFeedCursor(cursor));
    expect(decoded?.proofId).toBe("proof-1");
    expect(decoded?.approvedAt.toISOString()).toBe("2026-09-18T12:34:56.789Z");
  });

  it("is URL-safe", () => {
    const encoded = encodeFeedCursor({
      approvedAt: new Date("2026-09-18T12:34:56.789Z"),
      proofId: "proof-1",
    });
    expect(encoded).toBe(encodeURIComponent(encoded));
  });

  it("treats a missing cursor as the first page", () => {
    expect(decodeFeedCursor(null)).toBeNull();
    expect(decodeFeedCursor(undefined)).toBeNull();
    expect(decodeFeedCursor("")).toBeNull();
  });

  it("rejects a malformed cursor instead of throwing", () => {
    expect(decodeFeedCursor("not-base64-%%%")).toBeNull();
    expect(decodeFeedCursor(Buffer.from("no-separator").toString("base64url"))).toBeNull();
    expect(decodeFeedCursor(Buffer.from("not-a-date|proof-1").toString("base64url"))).toBeNull();
  });
});
