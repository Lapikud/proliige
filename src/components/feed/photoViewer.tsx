"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import type { FC, KeyboardEvent } from "react";
import { cn } from "~/lib/utils";

interface Props {
  urls: ReadonlyArray<string>;
  alt: string;
  index: number;
  onIndexChange: (index: number) => void;
  className?: string;
}

export const PhotoViewer: FC<Props> = ({ urls, alt, index, onIndexChange, className }) => (
  <div className={cn("relative flex items-center justify-center bg-black text-white", className)}>
    <Image
      src={urls[index] ?? urls[0] ?? ""}
      alt={`${alt} (${index + 1} of ${urls.length})`}
      width={1440}
      height={1440}
      unoptimized
      className="h-full w-full object-contain"
    />
    {urls.length > 1 && (
      <>
        <span className="absolute top-3 left-3 rounded-md bg-white/20 px-2 py-0.5 font-mono text-[11px]">
          {index + 1}/{urls.length}
        </span>
        {index > 0 && (
          <CarouselButton
            label="Previous photo"
            side="left"
            onClick={() => {
              onIndexChange(index - 1);
            }}
          />
        )}
        {index < urls.length - 1 && (
          <CarouselButton
            label="Next photo"
            side="right"
            onClick={() => {
              onIndexChange(index + 1);
            }}
          />
        )}
      </>
    )}
  </div>
);

export function photoKeys(index: number, count: number, onIndexChange: (index: number) => void) {
  return (event: KeyboardEvent) => {
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea")) return;
    if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    if (event.key === "ArrowRight" && index < count - 1) onIndexChange(index + 1);
  };
}

interface CarouselButtonProps {
  label: string;
  side: "left" | "right";
  onClick: () => void;
}

export const CarouselButton: FC<CarouselButtonProps> = ({ label, side, onClick }) => {
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
