"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "relative inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-card text-background after:absolute after:-inset-2 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-foreground data-[state=indeterminate]:bg-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="group">
        <Check className="size-3.5 group-data-[state=indeterminate]:hidden" strokeWidth={3} />
        <Minus className="hidden size-3.5 group-data-[state=indeterminate]:block" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
