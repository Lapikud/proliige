"use client";

import { type FC, useLayoutEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import { UserText } from "../ui/markdown";

interface Props {
  text: string;
  markdown: boolean;
  className?: string;
  onMore: () => void;
}

export const ClampedText: FC<Props> = ({ text, markdown, className, onMore }) => {
  const box = useRef<HTMLDivElement>(null);
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => {
      setClamped(element.scrollHeight > element.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [text]);

  return (
    <div className={className}>
      <div
        ref={box}
        className={cn(
          "leading-relaxed text-pretty",
          markdown ? "max-h-[6lh] overflow-hidden" : "line-clamp-4",
          markdown && clamped && "[mask-image:linear-gradient(to_bottom,black_75%,transparent)]",
        )}
      >
        <UserText text={text} markdown={markdown} />
      </div>
      {clamped && (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onMore}
          className="text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          more<span className="sr-only">: read the full post</span>
        </button>
      )}
    </div>
  );
};
