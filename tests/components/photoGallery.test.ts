import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhotoGallery } from "~/components/proof/photoGallery";
import { PhotoViewer } from "~/components/proof/photoViewer";

describe("proof photo gallery", () => {
  it("opens photos through accessible dialog buttons instead of new tabs", () => {
    const html = renderToStaticMarkup(
      createElement(PhotoGallery, {
        urls: ["/photo/1", "/photo/2"],
        alt: "Proof submitted by Alex",
        layout: "grid",
      }),
    );

    expect(html).toContain('aria-label="Open photo 1 of 2: Proof submitted by Alex"');
    expect(html).toContain('aria-label="Open photo 2 of 2: Proof submitted by Alex"');
    expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(2);
    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain("<a ");
  });

  it("renders nothing when there are no photos", () => {
    expect(
      renderToStaticMarkup(
        createElement(PhotoGallery, {
          urls: [],
          alt: "Proof photos",
        }),
      ),
    ).toBe("");
  });

  it.each([
    {
      index: 0,
      previous: false,
      next: true,
    },
    {
      index: 1,
      previous: true,
      next: true,
    },
    {
      index: 2,
      previous: true,
      next: false,
    },
  ])(
    "shows the selected photo and valid navigation at index $index",
    ({ index, previous, next }) => {
      const html = renderToStaticMarkup(
        createElement(PhotoViewer, {
          urls: ["/photo/1", "/photo/2", "/photo/3"],
          alt: "Proof photos",
          index,
          onIndexChange: () => undefined,
        }),
      );

      expect(html).toContain(`src="/photo/${index + 1}"`);
      expect(html).toContain(`alt="Proof photos (${index + 1} of 3)"`);
      expect(html.includes('aria-label="Previous photo"')).toBe(previous);
      expect(html.includes('aria-label="Next photo"')).toBe(next);
    },
  );
});
