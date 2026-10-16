"use client";

import Image from "next/image";
import { type FC, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import { CarouselButton } from "./photoViewer";

interface Props {
  urls: ReadonlyArray<string>;
  alt: string;
  onOpen: (index: number) => void;
}

export const PhotoCarousel: FC<Props> = ({ urls, alt, onOpen }) => {
  const track = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);

  if (urls.length === 0) {
    return null;
  }

  const showPhoto = (index: number) => {
    const element = track.current;
    element?.scrollTo({
      left: index * element.clientWidth,
      behavior: "smooth",
    });
  };

  const followScroll = () => {
    const element = track.current;
    if (element) {
      setCurrent(Math.round(element.scrollLeft / element.clientWidth));
    }
  };

  return (
    <div className="relative">
      <ul
        ref={track}
        onScroll={followScroll}
        className="flex snap-x snap-mandatory [scrollbar-width:none] list-none overflow-x-auto p-0"
      >
        {urls.map((url, index) => (
          <li key={url} className="w-full shrink-0 snap-center">
            <button
              type="button"
              aria-label={`Open photo ${index + 1} of ${urls.length}`}
              onClick={() => {
                onOpen(index);
              }}
              className="block w-full bg-photo-placeholder focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              <Image
                src={url}
                alt={`${alt} (${index + 1} of ${urls.length})`}
                width={720}
                height={720}
                unoptimized
                className="aspect-square w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {urls.length > 1 && (
        <>
          <span className="absolute top-3 right-3 rounded-md bg-foreground/75 px-2 py-0.5 font-mono text-[11px] text-white">
            {current + 1}/{urls.length}
          </span>
          {current > 0 && (
            <CarouselButton
              label="Previous photo"
              side="left"
              onClick={() => {
                showPhoto(current - 1);
              }}
            />
          )}
          {current < urls.length - 1 && (
            <CarouselButton
              label="Next photo"
              side="right"
              onClick={() => {
                showPhoto(current + 1);
              }}
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
          >
            {urls.map((url, index) => (
              <span
                key={url}
                className={cn(
                  "size-1.5 rounded-full",
                  index === current ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
