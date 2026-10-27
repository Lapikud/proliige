"use client";

import { ListFilter } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface Props {
  activeCount: number;
  children: ReactNode;
}

export function ReviewFilterPopover({ activeCount, children }: Readonly<Props>) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={activeCount > 0 ? "brand" : "subtle"}
          className="cursor-pointer"
          aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"}
        >
          <ListFilter aria-hidden="true" />
          Filters
          {activeCount > 0 && <span aria-hidden="true">· {activeCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        aria-label="Review filters"
        className="max-h-[var(--radix-popover-content-available-height)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-4"
        onSubmit={() => {
          setOpen(false);
        }}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
