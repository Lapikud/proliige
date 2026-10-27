import { describe, expect, it } from "vitest";
import { readReviewQuery, reviewHref } from "~/lib/reviewFilters";

const categoryId = "4d7f4117-1060-4f1f-8c1f-8b36ea881a16";

describe("review filter URLs", () => {
  it("reads combined filters and the selected queue", () => {
    expect(
      readReviewQuery({
        category: categoryId,
        policy: "repeatable",
        origin: "own",
        view: "reported",
      }),
    ).toEqual({
      filters: {
        categoryId,
        policy: "repeatable",
        ownTask: true,
      },
      view: "reported",
    });
  });

  it("ignores invalid or repeated parameters without losing valid filters", () => {
    const { filters, view } = readReviewQuery({
      category: "not-a-uuid",
      policy: "one_per_user",
      origin: ["own", "catalog"],
      view: "unknown",
    });

    expect(filters.categoryId).toBeUndefined();
    expect(filters.policy).toBe("one_per_user");
    expect(filters.ownTask).toBeUndefined();
    expect(view).toBeUndefined();
  });

  it("preserves the catalog filter when switching queues", () => {
    const { filters } = readReviewQuery({
      category: categoryId,
      origin: "catalog",
      view: "all",
    });
    const href = reviewHref(filters, "requested");
    const params = new URL(href, "https://example.org").searchParams;

    expect(params.get("category")).toBe(categoryId);
    expect(params.get("origin")).toBe("catalog");
    expect(params.get("view")).toBe("requested");
    expect(params.has("policy")).toBe(false);
    expect(filters.ownTask).toBe(false);
  });

  it("clears filters while keeping the selected queue", () => {
    expect(reviewHref({}, "reported")).toBe("/admin/review?view=reported");
  });

  it("uses the unfiltered page when no parameters are selected", () => {
    const { filters, view } = readReviewQuery({});

    expect(reviewHref(filters, view)).toBe("/admin/review");
  });
});
