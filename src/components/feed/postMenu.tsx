"use client";

import { Ellipsis } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { setProofHiddenAction } from "~/actions/review";
import { useAction } from "~/lib/form";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ReportDialog } from "./reportDialog";
import { UnapproveDialog } from "./unapproveDialog";

interface Props {
  proofId: string;
  taskTitle: string;
  points: number;
  hidden: boolean;
  canHide: boolean;
  reported: boolean;
  canModerate: boolean;
  onHiddenChange: (hidden: boolean) => void;
  onUnapproved: () => void;
}

const itemClassName =
  "w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted disabled:opacity-50";

export const PostMenu: FC<Props> = ({
  proofId,
  taskTitle,
  points,
  hidden,
  canHide,
  reported: initiallyReported,
  canModerate,
  onHiddenChange,
  onUnapproved,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"report" | "unapprove" | null>(null);
  const [reported, setReported] = useState(initiallyReported);
  const close = () => {
    setMenuOpen(false);
  };
  const visibility = useAction(setProofHiddenAction, {
    onSuccess: (_data, input) => {
      onHiddenChange(input.hidden);
      if (input.hidden) {
        toast("Removed from the feed.", {
          action: {
            label: "Undo",
            onClick: () => {
              visibility.run({
                proofId,
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
  const openDialog = (next: "report" | "unapprove") => {
    close();
    setDialog(next);
  };
  const onOpenChange = (open: boolean) => {
    if (!open) setDialog(null);
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
          {canModerate ? (
            <>
              {canHide && (
                <button
                  type="button"
                  disabled={visibility.pending}
                  className={itemClassName}
                  onClick={() => {
                    close();
                    visibility.run({
                      proofId,
                      hidden: !hidden,
                    });
                  }}
                >
                  {hidden ? "Show in feed" : "Remove from feed"}
                </button>
              )}
              <button
                type="button"
                className={`${itemClassName} text-destructive`}
                onClick={() => {
                  openDialog("unapprove");
                }}
              >
                Unapprove…
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={reported}
              className={itemClassName}
              onClick={() => {
                openDialog("report");
              }}
            >
              {reported ? "Reported" : "Report post…"}
            </button>
          )}
        </PopoverContent>
      </Popover>
      {canModerate ? (
        <UnapproveDialog
          proofId={proofId}
          taskTitle={taskTitle}
          points={points}
          open={dialog === "unapprove"}
          onOpenChange={onOpenChange}
          onDone={() => {
            setDialog(null);
            onUnapproved();
          }}
        />
      ) : (
        <ReportDialog
          proofId={proofId}
          taskTitle={taskTitle}
          open={dialog === "report"}
          onOpenChange={onOpenChange}
          onDone={() => {
            setDialog(null);
            setReported(true);
            toast("Thanks. An admin will take a look.");
          }}
        />
      )}
    </>
  );
};
