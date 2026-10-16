import type { ComponentProps, FC } from "react";
import { cn } from "~/lib/utils";

const field =
  "w-full rounded-xl border border-input bg-card px-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive";

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

export const Switch: FC<Omit<ComponentProps<"input">, "type" | "role">> = ({
  className,
  ...props
}) => (
  <span className={cn("relative inline-flex h-6 w-10 shrink-0", className)}>
    <input
      type="checkbox"
      role="switch"
      className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      {...props}
    />
    <span
      aria-hidden="true"
      className="h-6 w-10 rounded-full border border-input bg-muted transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-50"
    />
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1 left-1 size-4 rounded-full bg-card shadow-sm transition-transform peer-checked:translate-x-4"
    />
  </span>
);

export const Label: FC<ComponentProps<"label">> = ({ className, ...props }) => (
  <label className={cn("text-sm leading-none font-bold text-foreground", className)} {...props} />
);
