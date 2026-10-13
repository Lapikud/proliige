import { useRef, type FC } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { ErrorState } from "../ui/feedback";

interface Props {
  open: boolean;
  pending: boolean;
  error: string | null;
  onDismiss: () => void;
  onConfirm: () => void;
  onClosed: () => void;
}

export const DeleteCommentDialog: FC<Props> = ({
  open,
  pending,
  error,
  onDismiss,
  onConfirm,
  onClosed,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDismiss();
      }}
    >
      <DialogContent
        role="alertdialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onClosed();
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancelButtonRef.current?.focus();
        }}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogTitle className="text-lg font-bold">Delete comment?</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          This comment will be removed for everyone. It cannot be undone.
        </DialogDescription>

        {error && (
          <div className="mt-4">
            <ErrorState description={error} />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <DialogClose asChild>
            <Button ref={cancelButtonRef} type="button" variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="danger" disabled={pending} onClick={onConfirm}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
