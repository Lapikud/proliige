"use client";

import Image from "next/image";
import { useRef, useState, type FC } from "react";
import { cn } from "~/lib/utils";
import { PhotoDialog } from "./photoDialog";

interface Props {
  urls: ReadonlyArray<string>;
  alt: string;
  size?: "xs" | "sm" | "md";
  layout?: "row" | "grid";
}

const sizes = {
  xs: "size-12",
  sm: "size-20",
  md: "size-28",
};

export const PhotoGallery: FC<Props> = ({ urls, alt, size = "md", layout = "row" }) => {
  const [photo, setPhoto] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (urls.length === 0) {
    return null;
  }

  return (
    <>
      <ul
        className={cn(
          "list-none gap-2 p-0",
          layout === "grid" ? "grid grid-cols-3" : "flex flex-wrap",
        )}
      >
        {urls.map((url, index) => (
          <li key={url}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Open photo ${index + 1} of ${urls.length}: ${alt}`}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setPhoto(index);
              }}
              className="block w-full cursor-zoom-in overflow-hidden rounded-xl border border-border bg-photo-placeholder"
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
            </button>
          </li>
        ))}
      </ul>
      <PhotoDialog
        urls={urls}
        alt={alt}
        index={photo}
        onIndexChange={setPhoto}
        onClose={() => {
          setPhoto(null);
        }}
        onClosed={() => {
          triggerRef.current?.focus();
        }}
      />
    </>
  );
};
