import { describe, expect, it } from "vitest";
import { formatLinks, parseLinks } from "~/lib/achievementLinks";

describe("achievement links", () => {
  it("reads commas, new lines, markdown links and title|url", () => {
    expect(
      parseLinks("https://a.example, [Recap](https://b.example)\nSlides|https://c.example"),
    ).toEqual([
      {
        title: "https://a.example",
        url: "https://a.example",
      },
      {
        title: "Recap",
        url: "https://b.example",
      },
      {
        title: "Slides",
        url: "https://c.example",
      },
    ]);
  });

  it("gives back the same links after formatting them for editing", () => {
    const links = [
      {
        title: "https://a.example",
        url: "https://a.example",
      },
      {
        title: "Recap, part 1",
        url: "https://b.example/recap",
      },
      {
        title: "Notes [draft]",
        url: "https://c.example",
      },
    ];

    expect(parseLinks(formatLinks(links))).toEqual(links);
  });
});
