"use client";

import { X } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../ui/dialog";
import { PhotoViewer, photoKeys } from "./photoViewer";

interface Props {
  urls: ReadonlyArray<string>;
  alt: string;
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onClosed: () => void;
}

export function PhotoDialog({
  urls,
  alt,
  index,
  onIndexChange,
  onClose,
  onClosed,
}: Readonly<Props>) {
  return (
    <Dialog
      open={index !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onClosed();
        }}
        onKeyDown={photoKeys(index ?? 0, urls.length, onIndexChange)}
        className="h-[85dvh] max-w-5xl overflow-hidden bg-black p-0 text-white"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close photo viewer"
            className="absolute top-2 right-2 z-10 cursor-pointer bg-black/50 text-white hover:bg-black/70"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
        <PhotoViewer
          urls={urls}
          alt={alt}
          index={index ?? 0}
          onIndexChange={onIndexChange}
          className="h-full w-full"
        />
      </DialogContent>
    </Dialog>
  );
}
