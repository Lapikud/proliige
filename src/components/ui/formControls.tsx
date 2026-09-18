import type { ComponentProps, FC } from "react";
import { cn } from "~/lib/utils";

const field =
  "w-full rounded-xl border border-border bg-card px-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive";

export const Input: FC<ComponentProps<"input">> = ({ className, ...props }) => (
  <input className={cn(field, "h-11 py-2", className)} {...props} />
);

export const Textarea: FC<ComponentProps<"textarea">> = ({ className, ...props }) => (
  <textarea className={cn(field, "min-h-20 py-2", className)} {...props} />
);

export const Select: FC<ComponentProps<"select">> = ({ className, ...props }) => (
  <select className={cn(field, "h-11", className)} {...props} />
);

export const Checkbox: FC<Omit<ComponentProps<"input">, "type">> = ({ className, ...props }) => (
  <input type="checkbox" className={cn("size-[18px] accent-foreground", className)} {...props} />
);

export const Label: FC<ComponentProps<"label">> = ({ className, ...props }) => (
  <label className={cn("text-sm leading-none font-bold text-foreground", className)} {...props} />
);
