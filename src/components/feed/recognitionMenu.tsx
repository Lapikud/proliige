"use client";

import { Ellipsis } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { setRecognitionHiddenAction, takeBackRecognitionAction } from "~/actions/recognition";
import type { RecognitionBadge } from "~/core/ports/recognition";
import { useAction } from "~/lib/form";
import {
  RecognitionForm,
  type RecognitionEditing,
  type RecognitionSaved,
} from "../admin/recognitionForm";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { ErrorState } from "../ui/feedback";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface Props {
  editing: RecognitionEditing;
  badges: ReadonlyArray<RecognitionBadge>;
  hidden: boolean;
  onHiddenChange: (hidden: boolean) => void;
  onSaved: (saved: RecognitionSaved) => void;
  onTakenBack: () => void;
}

const itemClassName =
  "w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted disabled:opacity-50";

export const RecognitionMenu: FC<Props> = ({
  editing,
  badges,
  hidden,
  onHiddenChange,
  onSaved,
  onTakenBack,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"edit" | "takeBack" | null>(null);
  const visibility = useAction(setRecognitionHiddenAction, {
    onSuccess: (_data, input) => {
      onHiddenChange(input.hidden);
      if (input.hidden) {
        toast("Removed from the feed.", {
          action: {
            label: "Undo",
            onClick: () => {
              visibility.run({
                id: editing.id,
                hidden: false,
              });
            },
          },
        });
      }
    },
    onError: (message) => {
      toast.error(message);
    },
  });
  const takeBack = useAction(takeBackRecognitionAction, {
    onSuccess: () => {
      setDialog(null);
      onTakenBack();
    },
  });
  const open = (next: "edit" | "takeBack") => {
    setMenuOpen(false);
    setDialog(next);
  };
  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) setDialog(null);
  };

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Post actions" title="Post actions">
            <Ellipsis aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="min-w-48">
          <button
            type="button"
            className={itemClassName}
            onClick={() => {
              open("edit");
            }}
          >
            Edit…
          </button>
          <button
            type="button"
            disabled={visibility.pending}
            className={itemClassName}
            onClick={() => {
              setMenuOpen(false);
              visibility.run({
                id: editing.id,
                hidden: !hidden,
              });
            }}
          >
            {hidden ? "Show in feed" : "Remove from feed"}
          </button>
          <button
            type="button"
            className={`${itemClassName} text-destructive`}
            onClick={() => {
              open("takeBack");
            }}
          >
            Take back points…
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={dialog === "edit"} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogTitle className="text-lg font-bold">Edit recognition</DialogTitle>
          <DialogDescription className="mt-1 mb-3 text-sm text-muted-foreground">
            Change the text, badges or links. The points stay as they are.
          </DialogDescription>
          <RecognitionForm
            recipients={[]}
            badges={badges}
            editing={editing}
            onSaved={(saved) => {
              setDialog(null);
              onSaved(saved);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "takeBack"} onOpenChange={onOpenChange}>
        <DialogContent role="alertdialog">
          <DialogTitle className="text-lg font-bold">Take back points?</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            {editing.recipientName} loses the {editing.points} points and any badges from this
            recognition, and it leaves the feed. This cannot be undone.
          </DialogDescription>
          {takeBack.error && (
            <div className="mt-4">
              <ErrorState description={takeBack.error} />
            </div>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={takeBack.pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="danger"
              disabled={takeBack.pending}
              onClick={() => {
                takeBack.run({ id: editing.id });
              }}
            >
              {takeBack.pending ? "Taking back…" : "Take back points"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
