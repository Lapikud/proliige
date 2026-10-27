import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReviewFilters } from "~/components/review/filters";
import { ReviewFilterPopover } from "~/components/review/filterPopover";
import { Popover } from "~/components/ui/popover";

const category = {
  id: "4d7f4117-1060-4f1f-8c1f-8b36ea881a16",
  name: "Community",
  slug: "community",
};

const renderFilters = (props: ComponentProps<typeof ReviewFilters>) =>
  renderToStaticMarkup(createElement(Popover, null, createElement(ReviewFilters, props)));

describe("review filter controls", () => {
  it("shows applied filters and preserves the queue on submit and reset", () => {
    const html = renderFilters({
      categories: [category],
      filters: {
        categoryId: category.id,
        policy: "repeatable",
        ownTask: false,
      },
      view: "reported",
    });

    expect(html).toContain('action="/admin/review"');
    expect(html).toContain('name="view" value="reported"');
    expect(html).toContain(`value="${category.id}" selected=""`);
    expect(html).toContain('value="repeatable" selected=""');
    expect(html).toContain('value="catalog" selected=""');
    expect(html).toContain('href="/admin/review?view=reported"');
    expect(html).toContain("Review filters");
  });

  it("does not display an unknown category as an unfiltered selection", () => {
    const html = renderFilters({
      categories: [],
      filters: { categoryId: category.id },
      view: "all",
    });

    expect(html).toContain(`<option value="${category.id}" selected="">Unavailable category`);
    expect(html).not.toContain('<option value="" selected="">All categories');
  });

  it("keeps the filter form closed and announces the number of active filters", () => {
    const props = {
      activeCount: 3,
      children: "Filter form content",
    };
    const html = renderToStaticMarkup(createElement(ReviewFilterPopover, props));

    expect(html).toContain('aria-label="Filters, 3 active"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Filter form content");
  });
});
