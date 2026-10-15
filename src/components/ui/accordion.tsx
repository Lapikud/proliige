"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
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
          <ChevronDown className="size-4 shrink-0 transition-transform" />
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

export interface GroupAccordionItemProps {
  readonly value: string;
  readonly title: ReactNode;
  readonly leading?: ReactNode;
  readonly headerAction?: ReactNode;
  readonly heading?: "h2" | "h3";
  readonly children: ReactNode;
}

export function GroupAccordionItem({
  value,
  title,
  leading,
  headerAction,
  heading = "h2",
  children,
}: GroupAccordionItemProps) {
  return (
    <AccordionItem
      value={value}
      className="group overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-card"
    >
      <div className="flex items-center gap-3 border-border px-4 group-data-[state=open]:border-b">
        {leading}
        <AccordionTrigger heading={heading}>{title}</AccordionTrigger>
        {headerAction}
      </div>
      <AccordionContent className="pb-0">{children}</AccordionContent>
    </AccordionItem>
  );
}
