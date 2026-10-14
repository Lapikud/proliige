"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-border", className)} {...props} />;
}

export function AccordionTrigger({
  className,
  children,
  heading: Heading = "h3",
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger> & { readonly heading?: "h2" | "h3" }) {
  return (
    <AccordionPrimitive.Header asChild>
      <Heading className="flex min-w-0 flex-1">
        <AccordionPrimitive.Trigger
          className={cn(
            "flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-md text-left font-bold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&[data-state=open]>svg]:rotate-180",
            className,
          )}
          {...props}
        >
          {children}
          <ChevronDown className="size-4 shrink-0 opacity-70 transition-transform" />
        </AccordionPrimitive.Trigger>
      </Heading>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn("pb-3", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
