import type { FC } from "react";
import { cn } from "~/lib/utils";

export const UserAvatar: FC<{
  name: string;
  className?: string;
}> = ({ name, className }) => (
  <span
    aria-hidden="true"
    className={cn(
      "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-black text-brand-ink uppercase",
      className,
    )}
  >
    {name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")}
  </span>
);
