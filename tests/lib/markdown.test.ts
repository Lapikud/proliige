import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "~/lib/markdown";

describe("parseMarkdown", () => {
  it("parses headings, lists, paragraphs and code blocks", () => {
    expect(
      parseMarkdown(
        "# Title\n\n- one\n- two\n1. first\n\nline a\nline b\n\n```\nconst x = 1;\n```",
      ),
    ).toEqual([
      {
        type: "heading",
        level: 1,
        children: [
          {
            type: "text",
            text: "Title",
          },
        ],
      },
      {
        type: "list",
        ordered: false,
        items: [
          [
            {
              type: "text",
              text: "one",
            },
          ],
          [
            {
              type: "text",
              text: "two",
            },
          ],
        ],
      },
      {
        type: "list",
        ordered: true,
        items: [
          [
            {
              type: "text",
              text: "first",
            },
          ],
        ],
      },
      {
        type: "paragraph",
        lines: [
          [
            {
              type: "text",
              text: "line a",
            },
          ],
          [
            {
              type: "text",
              text: "line b",
            },
          ],
        ],
      },
      {
        type: "code",
        text: "const x = 1;",
      },
    ]);
  });

  it("caps deep headings at level 3 and keeps an unclosed code block", () => {
    expect(parseMarkdown("###### small\n```\nopen")).toEqual([
      {
        type: "heading",
        level: 3,
        children: [
          {
            type: "text",
            text: "small",
          },
        ],
      },
      {
        type: "code",
        text: "open",
      },
    ]);
  });
});

describe("parseInline", () => {
  it("parses bold, italic, code and links", () => {
    expect(parseInline("**b** and _i_ with `c` [site](https://example.com)")).toEqual([
      {
        type: "strong",
        children: [
          {
            type: "text",
            text: "b",
          },
        ],
      },
      {
        type: "text",
        text: " and ",
      },
      {
        type: "em",
        children: [
          {
            type: "text",
            text: "i",
          },
        ],
      },
      {
        type: "text",
        text: " with ",
      },
      {
        type: "code",
        text: "c",
      },
      {
        type: "text",
        text: " ",
      },
      {
        type: "link",
        href: "https://example.com",
        children: [
          {
            type: "text",
            text: "site",
          },
        ],
      },
    ]);
  });

  it("leaves unsafe links, snake_case and code contents as text", () => {
    expect(parseInline("[x](javascript:alert(1))")).toEqual([
      {
        type: "text",
        text: "[x](javascript:alert(1)",
      },
      {
        type: "text",
        text: ")",
      },
    ]);
    expect(parseInline("snake_case_name")).toEqual([
      {
        type: "text",
        text: "snake_case_name",
      },
    ]);
    expect(parseInline("`**raw**`")).toEqual([
      {
        type: "code",
        text: "**raw**",
      },
    ]);
  });
});
