"use client";

import { X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { GroupAccordionItem, type GroupAccordionItemProps } from "./accordion";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { cn } from "~/lib/utils";

interface Props<Item extends { readonly id: string }> extends Omit<
  GroupAccordionItemProps,
  "leading" | "children"
> {
  readonly label: string;
  readonly items: ReadonlyArray<Item>;
  readonly itemLabel: (item: Item) => string;
  readonly renderItem: (item: Item) => ReactNode;
  readonly actions: (selected: Array<Item>, clear: () => void) => ReactNode;
  readonly empty?: ReactNode;
}

export function SelectableAccordion<Item extends { readonly id: string }>({
  label,
  items,
  itemLabel,
  renderItem,
  actions,
  empty,
  ...group
}: Props<Item>) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
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
    <GroupAccordionItem
      {...group}
      leading={
        <Checkbox
          className={cn(items.length === 0 && "invisible")}
          checked={allState}
          disabled={items.length === 0}
          aria-label={`Select all in ${label}`}
          onCheckedChange={(checked) => {
            setSelectedIds(checked === true ? new Set(items.map((item) => item.id)) : new Set());
          }}
        />
      }
    >
      {selected.length > 0 && (
        <fieldset
          aria-label={`Actions for selected items in ${label}`}
          className="flex min-w-0 flex-wrap items-center gap-2 border-b border-border bg-muted px-4 py-2"
        >
          <span className="px-1 text-sm font-bold tabular-nums">{selected.length} selected</span>
          {actions(selected, clear)}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto w-9 px-0"
            aria-label="Clear selection"
            title="Clear selection"
            onClick={clear}
          >
            <X className="size-4" />
          </Button>
        </fieldset>
      )}
      {items.length === 0 ? (
        <div className="px-4">{empty}</div>
      ) : (
        <ul className="list-none px-4 py-1">
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
    </GroupAccordionItem>
  );
}
