import type { AchievementLink } from "~/core/ports/recognition";

const markdownLink = /^\[([^\]]+)\]\((\S+)\)$/;

export function parseLinks(value: string): Array<AchievementLink> {
  return value
    .split("\n")
    .flatMap((line) => (markdownLink.test(line.trim()) ? [line] : line.split(",")))
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const markdown = markdownLink.exec(entry);
      if (markdown)
        return {
          title: markdown[1]?.trim() ?? "",
          url: markdown[2] ?? "",
        };
      const separator = entry.indexOf("|");

      return separator < 0
        ? {
            title: entry.slice(0, 100),
            url: entry,
          }
        : {
            title: entry.slice(0, separator).trim(),
            url: entry.slice(separator + 1).trim(),
          };
    });
}

export function formatLinks(links: ReadonlyArray<AchievementLink>): string {
  return links
    .map(({ title, url }) => {
      if (title === url.slice(0, 100)) return url;
      if (!title.includes("]")) return `[${title}](${url})`;

      return `${title}|${url}`;
    })
    .join("\n");
}
