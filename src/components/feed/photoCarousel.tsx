"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { type FC, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../ui/dialog";

interface Props {
  urls: ReadonlyArray<string>;
  alt: string;
}

export const PhotoCarousel: FC<Props> = ({ urls, alt }) => {
  const track = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

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
              aria-label={`View photo full screen (${index + 1} of ${urls.length})`}
              onClick={() => {
                setSelectedPhoto(index);
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

      <Dialog
        open={selectedPhoto !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPhoto(null);
        }}
      >
        <DialogContent className="h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-none overflow-hidden border-0 bg-black p-2 text-white shadow-none sm:h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="Close photo"
              className="absolute top-2 right-2 z-10 size-11 p-0 text-white hover:bg-white/20 hover:text-white"
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </DialogClose>
          {selectedPhoto !== null && (
            <Image
              src={urls[selectedPhoto] ?? urls[0] ?? ""}
              alt={`${alt} (${selectedPhoto + 1} of ${urls.length})`}
              width={1440}
              height={1440}
              unoptimized
              className="h-full w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

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

interface CarouselButtonProps {
  label: string;
  side: "left" | "right";
  onClick: () => void;
}

const CarouselButton: FC<CarouselButtonProps> = ({ label, side, onClick }) => {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center",
        side === "left" ? "left-1" : "right-1",
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md">
        <Icon aria-hidden="true" className="size-5" />
      </span>
    </button>
  );
};
