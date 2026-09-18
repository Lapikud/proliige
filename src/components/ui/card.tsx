import type { ComponentProps, FC } from "react";
import { cn } from "~/lib/utils";

export const Card: FC<ComponentProps<"div">> = ({ className, ...props }) => (
  <div
    className={cn(
      "rounded-2xl border border-border bg-card text-card-foreground shadow-card",
      className,
    )}
    {...props}
  />
);

export const CardContent: FC<ComponentProps<"div">> = ({ className, ...props }) => (
  <div className={cn("p-4 sm:p-5", className)} {...props} />
);
