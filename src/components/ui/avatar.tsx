import { Crown } from "lucide-react";
import type { FC } from "react";
import { pointsConfig } from "~/config/points";
import { cn } from "~/lib/utils";

export const UserAvatar: FC<{
  name: string;
  className?: string;
  crowned?: boolean;
}> = ({ name, className, crowned = false }) => (
  <>
    <span
      aria-hidden="true"
      title={crowned ? pointsConfig.leaderTitle : undefined}
      className={cn(
        "relative inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-black text-brand-ink uppercase",
        crowned && "ring-2 ring-primary",
        className,
      )}
    >
      {name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")}
      {crowned && (
        <Crown className="absolute -top-2.5 -left-1.5 size-4 -rotate-[25deg] fill-primary text-foreground" />
      )}
    </span>
    {crowned && <span className="sr-only">{pointsConfig.leaderTitle}</span>}
  </>
);
