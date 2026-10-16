import Image from "next/image";
import type { FC } from "react";
import type { EarnedBadge } from "~/domain/feed";
import { cn } from "~/lib/utils";
import { Badge } from "../ui/badge";

const compactLimit = 3;

interface Props {
  badges: ReadonlyArray<EarnedBadge>;
  compact?: boolean;
}

export const EarnedBadges: FC<Props> = ({ badges, compact = false }) => {
  if (badges.length === 0) return null;
  const shown = compact ? badges.slice(0, compactLimit) : badges;
  const hidden = badges.slice(shown.length);

  return (
    <ul
      aria-label="Badges"
      className={cn("flex list-none flex-wrap items-center p-0", compact ? "gap-1" : "gap-2")}
    >
      {shown.map((badge) => (
        <li key={badge.id} title={badge.label}>
          {compact && badge.imageUrl ? (
            <Image
              src={badge.imageUrl}
              alt={badge.label}
              width={20}
              height={20}
              unoptimized
              className="size-5 rounded-full object-cover"
            />
          ) : (
            <Badge variant="brand" className={cn(compact ? "px-1.5 py-0" : "gap-1.5")}>
              {badge.imageUrl && (
                <Image
                  src={badge.imageUrl}
                  alt=""
                  width={24}
                  height={24}
                  unoptimized
                  className="size-6 rounded-full object-cover"
                />
              )}
              {badge.label}
            </Badge>
          )}
        </li>
      ))}
      {hidden.length > 0 && (
        <li
          title={hidden.map(({ label }) => label).join(", ")}
          className="text-xs text-muted-foreground"
        >
          +{hidden.length}
        </li>
      )}
    </ul>
  );
};
