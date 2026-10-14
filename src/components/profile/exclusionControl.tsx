"use client";

import { Ellipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, type FC } from "react";
import { setUserExcludedAction } from "~/actions/user";
import { useAction } from "~/lib/form";
import { buttonVariants } from "../ui/button";
import { ErrorState } from "../ui/feedback";

interface Props {
  userId: string;
  excluded: boolean;
}

export const ExclusionControl: FC<Props> = ({ userId, excluded }) => {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const exclusion = useAction(setUserExcludedAction, {
    onSuccess: () => {
      detailsRef.current?.removeAttribute("open");
      router.refresh();
    },
  });
  let actionLabel: string;
  if (exclusion.pending) {
    actionLabel = "Saving…";
  } else if (excluded) {
    actionLabel = "Restore to public views";
  } else {
    actionLabel = "Exclude from public views";
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <details ref={detailsRef} className="relative">
        <summary
          aria-label="Profile actions"
          className={`${buttonVariants({
            variant: "ghost",
            size: "icon",
          })} list-none [&::-webkit-details-marker]:hidden`}
        >
          <Ellipsis aria-hidden="true" />
        </summary>
        <div className="absolute top-full right-0 z-10 mt-1 min-w-56 rounded-xl border border-border bg-card p-2 shadow-card">
          <button
            type="button"
            disabled={exclusion.pending}
            onClick={() => {
              exclusion.run({
                userId,
                excluded: !excluded,
              });
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            {actionLabel}
          </button>
        </div>
      </details>
      {exclusion.error && <ErrorState description={exclusion.error} />}
    </div>
  );
};
