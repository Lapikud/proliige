import type { FC } from "react";
import type { ProofWithContext } from "~/core/ports/proof";
import { formatDateTime } from "~/lib/utils";
import { ProofStatusBadge } from "./statusBadge";
import { PhotoGallery } from "./photoGallery";
import { ReviewerList } from "../review/reviewers";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";

interface Props {
  entry: ProofWithContext;
}

export const MyProofCard: FC<Props> = ({
  entry: { proof, taskTitle, taskPoints, categoryName, photos, requestedReviewers, reviewedByName },
}) => (
  <Card>
    <CardContent className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-black text-foreground">{taskTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {categoryName} · submitted{" "}
            <time dateTime={proof.submittedAt.toISOString()}>
              {formatDateTime(proof.submittedAt)}
            </time>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProofStatusBadge status={proof.status} />
          <Badge variant="points" className="tabular-nums">
            {taskPoints} pts
          </Badge>
        </div>
      </div>

      {proof.status === "rejected" && proof.rejectionReason && (
        <p className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {proof.rejectionReason}
        </p>
      )}

      <PhotoGallery
        urls={photos.map((item) => `/api/photos/${proof.id}/${item.id}`)}
        alt={`Photos you submitted for ${taskTitle}`}
        size="sm"
      />

      <ReviewerList
        requested={requestedReviewers}
        status={proof.status}
        reviewedByName={reviewedByName}
      />
    </CardContent>
  </Card>
);
