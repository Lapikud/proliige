"use client";

import { Camera, ChevronRight, PenLine } from "lucide-react";
import Link from "next/link";
import type { FC, ReactNode } from "react";
import { cn } from "~/lib/utils";
import { Badge } from "../ui/badge";

const rowClassName =
  "flex min-h-12 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

interface Props {
  readonly title: string;
  readonly policy: string;
  readonly points: number;
  readonly photoRequired: boolean;
  readonly textRequired: boolean;
  readonly muted?: boolean;
  readonly disabled?: boolean;
  readonly status?: ReactNode;
  readonly href?: string;
  readonly onClick?: () => void;
  readonly "aria-label"?: string;
  readonly action?: ReactNode;
}

export const TaskRow: FC<Props> = ({
  title,
  policy,
  points,
  photoRequired,
  textRequired,
  muted = false,
  disabled = false,
  status,
  href,
  onClick,
  "aria-label": ariaLabel,
  action,
}) => {
  const content = (
    <>
      <span
        className={cn(
          "min-w-0 flex-1 font-semibold wrap-break-word",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {title}
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        {photoRequired && (
          <Badge variant="brand" title="Photo required">
            <Camera className="size-3.5" aria-hidden />
            <span className="sr-only">Photo required</span>
          </Badge>
        )}
        {textRequired && (
          <Badge variant="brand" title="Written answer required">
            <PenLine className="size-3.5" aria-hidden />
            <span className="sr-only">Written answer required</span>
          </Badge>
        )}
        {status}
        <span className="text-sm text-muted-foreground">{policy}</span>
        <Badge variant="points" className={cn("tabular-nums", muted && "opacity-60")}>
          {points} pts
        </Badge>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </span>
    </>
  );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      {href === undefined ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          className={rowClassName}
          disabled={disabled}
        >
          {content}
        </button>
      ) : (
        <Link href={href} aria-label={ariaLabel} className={rowClassName}>
          {content}
        </Link>
      )}
      {action}
    </div>
  );
};
