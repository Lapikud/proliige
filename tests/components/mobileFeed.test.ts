import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CategoryFilter } from "~/components/feed/categoryFilter";
import { PhotoCarousel } from "~/components/feed/photoCarousel";
import { LeaderboardStories } from "~/components/leaderboard/stories";

describe("mobile feed controls", () => {
  it("keeps an empty leaderboard period control attached to an empty state", () => {
    const html = renderToStaticMarkup(
      createElement(LeaderboardStories, {
        rows: [],
        period: "month",
      }),
    );

    expect(html).toContain("Leaderboard");
    expect(html).toContain("No points yet this month.");
    expect(html).toContain('aria-label="Leaderboard period"');
    expect(html).toContain("min-h-11");
  });

  it("renders category filter links with 44px minimum touch targets", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryFilter, {
        categories: [
          {
            id: "culture",
            name: "Culture",
            slug: "culture",
          },
          {
            id: "community",
            name: "Community",
            slug: "community",
          },
        ],
        current: null,
      }),
    );

    expect(html).toContain("min-h-11");
  });

  it("opens feed photos in-app instead of a new tab", () => {
    const html = renderToStaticMarkup(
      createElement(PhotoCarousel, {
        urls: ["/photo/1"],
        alt: "Proof photo",
        onOpen: () => undefined,
      }),
    );

    expect(html).not.toContain('target="_blank"');
    expect(html).toContain("Open photo 1 of 1");
  });
});
