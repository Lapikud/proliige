"use client";

import { useState } from "react";
import Image from "next/image";
import { createRecognitionBadgeAction } from "~/actions/recognition";
import type { RecognitionBadge } from "~/core/ports/recognition";
import { useAction } from "~/lib/form";
import { Button } from "~/components/ui/button";
import { Input, Label } from "~/components/ui/formControls";

export function BadgeCreator({ onCreated }: { onCreated?: (badge: RecognitionBadge) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const action = useAction(createRecognitionBadgeAction, {
    onSuccess: (badge) => {
      onCreated?.(badge);
      setLabel("");
      setImageUrl("");
      setOpen(false);
    },
  });

  return (
    <div className="contents">
      {!open ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => {
            setOpen(true);
          }}
        >
          Add a badge
        </Button>
      ) : (
        <form
          className="flex basis-full flex-col gap-3 rounded-xl border border-border bg-muted p-3"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            action.run({
              label,
              imageUrl,
            });
          }}
        >
          <h3 className="text-sm font-bold">Create a reusable badge</h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-badge-label">Badge name</Label>
            <Input
              id="new-badge-label"
              required
              maxLength={60}
              value={label}
              onChange={(event) => {
                setLabel(event.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-badge-image">Image URL (optional)</Label>
            <Input
              id="new-badge-image"
              type="url"
              placeholder="https://example.com/badge.png"
              value={imageUrl}
              onChange={(event) => {
                setImageUrl(event.target.value);
              }}
            />
          </div>
          {imageUrl && /^https?:\/\//i.test(imageUrl) && (
            <Image
              src={imageUrl}
              alt="Badge image preview"
              width={48}
              height={48}
              unoptimized
              className="size-12 rounded-full object-cover"
            />
          )}
          {action.error && (
            <p role="alert" className="text-sm text-destructive">
              {action.error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={action.pending}>
              {action.pending ? "Saving…" : "Save badge"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
