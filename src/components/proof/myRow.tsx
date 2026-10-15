import Link from "next/link";
import type { FC } from "react";
import type { ProofWithContext } from "~/core/ports/proof";
import { formatDateTime } from "~/lib/utils";
import { PhotoGallery } from "./photoGallery";
import { Badge } from "../ui/badge";

interface Props {
  entry: ProofWithContext;
}

export const MyProofRow: FC<Props> = ({
  entry: {
    proof,
    taskTitle,
    ownTask,
    taskPoints,
    categoryName,
    photos,
    requestedReviewers,
    reviewedByName,
  },
}) => {
  let review = "any admin can review it";
  if (reviewedByName !== null) review = `reviewed by ${reviewedByName}`;
  else if (requestedReviewers.length > 0) {
    review = `waiting on ${requestedReviewers.map((reviewer) => reviewer.displayName).join(", ")}`;
  }

  return (
    <div className="flex flex-col gap-2 px-2 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {ownTask ? (
            <span className="font-semibold break-words text-foreground">{taskTitle}</span>
          ) : (
            <Link
              href={`/tasks/${proof.taskId}`}
              className="font-semibold break-words text-foreground hover:text-brand-ink"
            >
              {taskTitle}
            </Link>
          )}
          <p className="text-sm text-muted-foreground">
            {categoryName} · submitted{" "}
            <time dateTime={proof.submittedAt.toISOString()}>
              {formatDateTime(proof.submittedAt)}
            </time>{" "}
            · {review}
          </p>
        </div>
        <Badge variant="points" className="tabular-nums">
          {taskPoints} pts
        </Badge>
      </div>

      {proof.status === "rejected" && proof.rejectionReason && (
        <p className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {proof.rejectionReason}
        </p>
      )}

      <PhotoGallery
        urls={photos.map((item) => `/api/photos/${proof.id}/${item.id}`)}
        alt={`Photos you submitted for ${taskTitle}`}
        size="xs"
      />
    </div>
  );
};
