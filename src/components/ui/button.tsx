import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, FC } from "react";
import { cn } from "~/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold whitespace-nowrap transition-[color,background-color,box-shadow,transform] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        brand:
          "border-2 border-foreground bg-primary font-black text-primary-foreground shadow-hard hover:bg-primary-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm",
        solid: "border-2 border-foreground bg-foreground text-background hover:bg-foreground/85",
        outline: "border-2 border-foreground bg-card text-foreground hover:bg-muted",
        subtle: "border border-border bg-card text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        danger: "bg-destructive text-white hover:opacity-90",
        link: "text-brand-ink underline underline-offset-4 hover:no-underline",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-4",
        lg: "h-12 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "brand",
      size: "md",
    },
  },
);

type Props = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button: FC<Props> = ({ className, variant, size, asChild = false, ...props }) => {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(
        buttonVariants({
          variant,
          size,
        }),
        className,
      )}
      {...props}
    />
  );
};
