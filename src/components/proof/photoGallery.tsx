import Image from "next/image";
import type { FC } from "react";
import { cn } from "~/lib/utils";

interface Props {
  urls: ReadonlyArray<string>;
  alt: string;
  size?: "sm" | "md";
  layout?: "row" | "grid";
}

const sizes = {
  sm: "size-20",
  md: "size-28",
};

export const PhotoGallery: FC<Props> = ({ urls, alt, size = "md", layout = "row" }) => {
  if (urls.length === 0) {
    return null;
  }

  return (
    <ul
      className={cn(
        "list-none gap-2 p-0",
        layout === "grid" ? "grid grid-cols-3" : "flex flex-wrap",
      )}
    >
      {urls.map((url, index) => (
        <li key={url}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-xl border border-border bg-photo-placeholder"
          >
            <Image
              src={url}
              alt={`${alt} (${index + 1} of ${urls.length})`}
              width={320}
              height={320}
              unoptimized
              className={cn(
                "object-cover",
                layout === "grid" ? "aspect-square w-full" : sizes[size],
              )}
            />
          </a>
        </li>
      ))}
    </ul>
  );
};
