import { describe, expect, it } from "vitest";
import { commentsResponseSchema } from "~/components/feed/model";

describe("feed comments response", () => {
  it("accepts a valid comment list", () => {
    const response = {
      comments: [
        {
          id: "comment-1",
          authorId: "user-1",
          authorName: "Alex",
          body: "Nice work!",
          createdAt: "2026-10-05T12:00:00.000Z",
          deleted: false,
          deletable: true,
        },
      ],
    };

    expect(commentsResponseSchema.parse(response)).toEqual(response);
  });

  it("rejects a malformed comment list", () => {
    expect(() => commentsResponseSchema.parse({ comments: null })).toThrow();
    expect(() =>
      commentsResponseSchema.parse({
        comments: [
          {
            id: "comment-1",
            body: "Nice work!",
          },
        ],
      }),
    ).toThrow();
  });
});
