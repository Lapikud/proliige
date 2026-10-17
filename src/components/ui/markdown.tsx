import { Fragment, type FC, type ReactNode } from "react";
import { type Inline, parseMarkdown } from "~/lib/markdown";
import { cn } from "~/lib/utils";

const headingClass = {
  1: "text-[1.25em] font-black",
  2: "text-[1.125em] font-black",
  3: "font-bold",
} as const;

export const UserText: FC<{ text: string; markdown: boolean; className?: string }> = ({
  text,
  markdown,
  className,
}) =>
  markdown ? (
    <Markdown source={text} className={className} />
  ) : (
    <p className={cn("wrap-break-word whitespace-pre-wrap", className)}>{text}</p>
  );

export const MarkdownPreview: FC<{ source: string }> = ({ source }) => (
  <section
    aria-label="Preview"
    className="min-w-0 rounded-xl border border-dashed border-border px-3 py-2 text-sm leading-relaxed"
  >
    <p className="mb-1 text-xs font-bold text-muted-foreground">Preview</p>
    <Markdown source={source} />
  </section>
);

export const Markdown: FC<{ source: string; className?: string | undefined }> = ({
  source,
  className,
}) => (
  <div className={cn("flex max-w-full min-w-0 flex-col gap-2 wrap-break-word", className)}>
    {parseMarkdown(source).map((block, index) => {
      switch (block.type) {
        case "heading": {
          const Heading = `h${String(block.level + 2)}` as "h3" | "h4" | "h5";

          return (
            <Heading key={index} className={headingClass[block.level]}>
              {renderInline(block.children)}
            </Heading>
          );
        }
        case "list": {
          const List = block.ordered ? "ol" : "ul";

          return (
            <List
              key={index}
              className={cn(
                "flex flex-col gap-1 pl-5",
                block.ordered ? "list-decimal" : "list-disc",
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </List>
          );
        }
        case "code":
          return (
            <pre
              key={index}
              className="max-w-full overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-[0.875em] whitespace-pre"
            >
              <code>{block.text}</code>
            </pre>
          );
        case "paragraph":
          return (
            <p key={index}>
              {block.lines.map((line, lineIndex) => (
                <Fragment key={lineIndex}>
                  {lineIndex > 0 && <br />}
                  {renderInline(line)}
                </Fragment>
              ))}
            </p>
          );
      }
    })}
  </div>
);

function renderInline(nodes: ReadonlyArray<Inline>): ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return <Fragment key={index}>{node.text}</Fragment>;
      case "code":
        return (
          <code key={index} className="rounded bg-muted px-1 font-mono text-[0.875em]">
            {node.text}
          </code>
        );
      case "strong":
        return <strong key={index}>{renderInline(node.children)}</strong>;
      case "em":
        return <em key={index}>{renderInline(node.children)}</em>;
      case "link":
        return (
          <a
            key={index}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-brand-ink underline underline-offset-4"
          >
            {renderInline(node.children)}
          </a>
        );
    }
  });
}
