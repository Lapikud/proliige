import Link from "next/link";
import type { FC } from "react";
import type { ProofWithContext } from "~/core/ports/proof";
import { formatRelative } from "~/lib/utils";
import { UserAvatar } from "../ui/avatar";
import { PhotoGallery } from "../proof/photoGallery";
import { Badge } from "../ui/badge";

interface Props {
  entry: ProofWithContext;
}

export const HistoryRow: FC<Props> = ({
  entry: {
    proof,
    taskTitle,
    taskPoints,
    ownTask,
    categoryName,
    userDisplayName,
    reviewedByName,
    photos,
  },
}) => (
  <div className="flex items-start gap-3 px-2 py-3">
    <Link href={`/users/${proof.userId}`} aria-hidden="true" tabIndex={-1}>
      <UserAvatar name={userDisplayName} className="size-9 text-xs" />
    </Link>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <p className="text-sm break-words text-foreground">
        <Link href={`/users/${proof.userId}`} className="font-bold hover:text-brand-ink">
          {userDisplayName}
        </Link>{" "}
        · {taskTitle}
        {ownTask && (
          <Badge variant="brand" className="ml-2 align-middle">
            Own task
          </Badge>
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        {categoryName} · reviewed by {reviewedByName ?? "an admin"}
        {proof.reviewedAt && (
          <>
            {" · "}
            <time dateTime={proof.reviewedAt.toISOString()}>
              {formatRelative(proof.reviewedAt)}
            </time>
          </>
        )}
      </p>
      {proof.textAnswer && (
        <blockquote className="mt-2 rounded-xl border border-border bg-muted px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {proof.textAnswer}
        </blockquote>
      )}
      <PhotoGallery
        urls={photos.map((photo) => `/api/photos/${proof.id}/${photo.id}`)}
        alt={`Proof submitted by ${userDisplayName}`}
        size="sm"
      />
      {proof.rejectionReason && (
        <p className="mt-1 rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {proof.rejectionReason}
        </p>
      )}
    </div>
    {proof.status === "approved" && (
      <Badge variant="points" className="shrink-0 tabular-nums">
        +{taskPoints}
      </Badge>
    )}
  </div>
);
