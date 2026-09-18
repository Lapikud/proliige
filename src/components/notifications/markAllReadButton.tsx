"use client";

import type { FC } from "react";
import { markAllReadAction } from "~/actions/notification";
import { useAction } from "~/lib/form";
import { Button } from "../ui/button";

export const MarkAllReadButton: FC = () => {
  const { run, pending } = useAction(markAllReadAction);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        run({});
      }}
    >
      {pending ? "Marking…" : "Mark all as read"}
    </Button>
  );
};
