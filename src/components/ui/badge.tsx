import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, FC } from "react";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-foreground/80",
        brand: "border-brand-ink/20 bg-brand-soft text-brand-ink",
        pending: "border-brand-ink/20 bg-brand-soft text-brand-ink",
        approved: "border-success/20 bg-success-soft text-success",
        rejected: "border-destructive/20 bg-destructive-soft text-destructive",
        outline: "border-border-strong bg-background text-foreground",
        points:
          "rounded-lg border-foreground bg-primary font-mono text-primary-foreground shadow-hard-sm",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type Props = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export const Badge: FC<Props> = ({ className, variant, ...props }) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);
