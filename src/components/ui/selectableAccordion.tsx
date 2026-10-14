"use client";

import { X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { cn } from "~/lib/utils";

interface Props<Item extends { readonly id: string }> {
  readonly value: string;
  readonly id?: string;
  readonly title: ReactNode;
  readonly label: string;
  readonly items: ReadonlyArray<Item>;
  readonly itemLabel: (item: Item) => string;
  readonly renderItem: (item: Item) => ReactNode;
  readonly actions: (selected: Array<Item>, clear: () => void) => ReactNode;
  readonly headerAction?: ReactNode;
  readonly empty?: ReactNode;
  readonly className?: string;
}

export function SelectableAccordion<Item extends { readonly id: string }>({
  value,
  id,
  title,
  label,
  items,
  itemLabel,
  renderItem,
  actions,
  headerAction,
  empty,
  className,
}: Props<Item>) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  // Ids of items that left the list (moved, archived, filtered out) are ignored, not kept.
  const selected = items.filter((item) => selectedIds.has(item.id));
  const clear = () => {
    setSelectedIds(new Set());
  };
  const toggle = (itemId: string, checked: boolean) => {
    const next = new Set(selected.map((item) => item.id));
    if (checked) next.add(itemId);
    else next.delete(itemId);
    setSelectedIds(next);
  };

  let allState: boolean | "indeterminate" = false;
  if (selected.length > 0) allState = selected.length === items.length ? true : "indeterminate";

  return (
    <AccordionItem
      value={value}
      id={id}
      className={cn(
        "group overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-hard-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-foreground bg-ink px-3 text-white group-data-[state=open]:border-b-2">
        <Checkbox
          className={cn(
            "border-white text-primary-foreground data-[state=checked]:bg-white data-[state=indeterminate]:bg-white",
            items.length === 0 && "invisible",
          )}
          checked={allState}
          disabled={items.length === 0}
          aria-label={`Select all in ${label}`}
          onCheckedChange={(checked) => {
            setSelectedIds(checked === true ? new Set(items.map((item) => item.id)) : new Set());
          }}
        />
        <AccordionTrigger heading="h2" className="text-white">
          {title}
        </AccordionTrigger>
        {headerAction}
      </div>
      <AccordionContent className="pb-0">
        {selected.length > 0 && (
          <div
            role="group"
            aria-label={`Actions for selected items in ${label}`}
            className="flex flex-wrap items-center gap-2 border-b-2 border-foreground bg-primary px-3 py-2 text-primary-foreground"
          >
            <span className="px-1 text-sm font-black tabular-nums">{selected.length} selected</span>
            {actions(selected, clear)}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto w-9 px-0 hover:bg-foreground/10"
              aria-label="Clear selection"
              title="Clear selection"
              onClick={clear}
            >
              <X className="size-4" />
            </Button>
          </div>
        )}
        {items.length === 0 ? (
          <div className="px-3">{empty}</div>
        ) : (
          <ul className="list-none px-3 py-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 border-b border-border/70 py-2 last:border-b-0 sm:gap-3"
              >
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  aria-label={`Select ${itemLabel(item)}`}
                  onCheckedChange={(checked) => {
                    toggle(item.id, checked === true);
                  }}
                />
                {renderItem(item)}
              </li>
            ))}
          </ul>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
