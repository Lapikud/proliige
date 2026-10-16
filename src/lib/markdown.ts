export type Inline =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "code"; readonly text: string }
  | { readonly type: "strong" | "em"; readonly children: ReadonlyArray<Inline> }
  | { readonly type: "link"; readonly href: string; readonly children: ReadonlyArray<Inline> };

export type Block =
  | {
      readonly type: "heading";
      readonly level: 1 | 2 | 3;
      readonly children: ReadonlyArray<Inline>;
    }
  | { readonly type: "paragraph"; readonly lines: ReadonlyArray<ReadonlyArray<Inline>> }
  | {
      readonly type: "list";
      readonly ordered: boolean;
      readonly items: ReadonlyArray<ReadonlyArray<Inline>>;
    }
  | { readonly type: "code"; readonly text: string };

const fence = /^\s*```/;
const headingLine = /^(#{1,6})\s+(.*)$/;
const listLine = /^\s*([-*+]|\d+[.)])\s+(.*)$/;

const inlinePatterns = [
  {
    type: "code",
    pattern: /`([^`\n]+)`/,
  },
  {
    type: "link",
    pattern: /\[([^\]\n]+)\]\(([^)\s]+)\)/,
  },
  {
    type: "strong",
    pattern: /\*\*(?=\S)(.+?)\*\*|__(?=\S)(.+?)__/,
  },
  {
    type: "em",
    pattern: /\*(?=[^\s*])([^*]+?)\*|(?<!\w)_(?=[^\s_])([^_]+?)_(?!\w)/,
  },
] as const;

export function parseMarkdown(source: string): Array<Block> {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Array<Block> = [];
  let index = 0;
  const line = () => lines[index] ?? "";

  while (index < lines.length) {
    if (line().trim() === "") {
      index += 1;
      continue;
    }

    if (fence.test(line())) {
      const body: Array<string> = [];
      index += 1;
      while (index < lines.length && !fence.test(line())) {
        body.push(line());
        index += 1;
      }
      index += 1;
      blocks.push({
        type: "code",
        text: body.join("\n"),
      });
      continue;
    }

    const heading = headingLine.exec(line());
    if (heading) {
      blocks.push({
        type: "heading",
        level: Math.min(heading[1]?.length ?? 1, 3) as 1 | 2 | 3,
        children: parseInline(heading[2] ?? ""),
      });
      index += 1;
      continue;
    }

    const first = listItem(line());
    if (first) {
      const items: Array<Array<Inline>> = [];
      let item: ReturnType<typeof listItem> = first;
      while (item?.ordered === first.ordered) {
        items.push(parseInline(item.text));
        index += 1;
        item = listItem(line());
      }
      blocks.push({
        type: "list",
        ordered: first.ordered,
        items,
      });
      continue;
    }

    const paragraph: Array<Array<Inline>> = [];
    while (
      index < lines.length &&
      line().trim() !== "" &&
      !fence.test(line()) &&
      !headingLine.test(line()) &&
      !listLine.test(line())
    ) {
      paragraph.push(parseInline(line()));
      index += 1;
    }
    blocks.push({
      type: "paragraph",
      lines: paragraph,
    });
  }

  return blocks;
}

function listItem(line: string): { ordered: boolean; text: string } | null {
  const match = listLine.exec(line);

  return match
    ? {
        ordered: /\d/.test(match[1] ?? ""),
        text: match[2] ?? "",
      }
    : null;
}

export function parseInline(text: string): Array<Inline> {
  const nodes: Array<Inline> = [];
  let rest = text;

  while (rest) {
    let best: { type: (typeof inlinePatterns)[number]["type"]; match: RegExpExecArray } | null =
      null;
    for (const { type, pattern } of inlinePatterns) {
      const match = pattern.exec(rest);
      if (match && (best === null || match.index < best.match.index))
        best = {
          type,
          match,
        };
    }
    if (best === null) {
      nodes.push({
        type: "text",
        text: rest,
      });
      break;
    }

    const { type, match } = best;
    if (match.index > 0)
      nodes.push({
        type: "text",
        text: rest.slice(0, match.index),
      });
    const inner = match[1] ?? match[2] ?? "";
    if (type === "code")
      nodes.push({
        type: "code",
        text: inner,
      });
    else if (type === "link") {
      const href = match[2] ?? "";
      nodes.push(
        /^https?:\/\//i.test(href)
          ? {
              type: "link",
              href,
              children: parseInline(inner),
            }
          : {
              type: "text",
              text: match[0],
            },
      );
    } else
      nodes.push({
        type,
        children: parseInline(inner),
      });
    rest = rest.slice(match.index + match[0].length);
  }

  return nodes;
}
