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
    <div
      className={cn("min-w-0 cursor-pointer", className)}
      onClick={(event) => {
        if (!(event.target instanceof Element && event.target.closest("a"))) onMore();
      }}
    >
      <div
        ref={box}
        className={cn(
          "leading-relaxed text-pretty",
          "overflow-hidden",
          markdown ? "max-h-[6lh]" : "max-h-[4lh]",
          clamped && "[mask-image:linear-gradient(to_bottom,black_50%,transparent)]",
        )}
      >
        <UserText text={text} markdown={markdown} />
      </div>
    </div>
  );
};
