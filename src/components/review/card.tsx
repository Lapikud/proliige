"use client";

import { Check, GitPullRequest, X } from "lucide-react";
import { type FC, useState } from "react";
import { approveProofAction } from "~/actions/review";
import type { ProofStatus } from "~/domain/proof";
import { useAction } from "~/lib/form";
import { formatDateTime } from "~/lib/utils";
import { ProofStatusBadge } from "../proof/statusBadge";
import { PhotoGallery } from "../proof/photoGallery";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { ErrorState } from "../ui/feedback";
import type { PendingProofView } from "./model";
import { RejectForm } from "./rejectForm";
import { ReviewerList } from "./reviewers";

interface Props {
  proof: PendingProofView;
}

type Stage = "reviewing" | "rejecting" | Exclude<ProofStatus, "pending">;

export const ReviewCard: FC<Props> = ({ proof }) => {
  const [stage, setStage] = useState<Stage>("reviewing");
  const approve = useAction(approveProofAction, {
    onSuccess: () => {
      setStage("approved");
    },
  });

  if (stage === "approved" || stage === "rejected") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3">
          <ProofStatusBadge status={stage} />
          <p className="text-sm text-muted-foreground">
            {proof.userDisplayName} · {proof.taskTitle}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <GitPullRequest aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="text-base font-black text-foreground">{proof.taskTitle}</h2>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{proof.userDisplayName}</span> wants{" "}
              <span className="font-mono">{proof.points} pts</span> · {proof.categoryName} ·{" "}
              <time dateTime={proof.submittedAt}>{formatDateTime(proof.submittedAt)}</time>
            </p>
          </div>
          {proof.requestedFromMe && (
            <Badge variant="pending" className="shrink-0 font-black">
              Review requested
            </Badge>
          )}
        </div>

        <PhotoGallery
          urls={proof.photoUrls}
          alt={`Photos submitted by ${proof.userDisplayName}`}
          layout="grid"
        />

        <ReviewerList requested={proof.requestedReviewers} status="pending" reviewedByName={null} />

        {approve.error && <ErrorState description={approve.error} />}

        {stage === "rejecting" ? (
          <RejectForm
            proofId={proof.proofId}
            onRejected={() => {
              setStage("rejected");
            }}
            onCancel={() => {
              setStage("reviewing");
            }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              disabled={approve.pending}
              onClick={() => {
                approve.run({ proofId: proof.proofId });
              }}
            >
              <Check aria-hidden="true" />
              {approve.pending ? "Approving…" : "Approve"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setStage("rejecting");
              }}
            >
              <X aria-hidden="true" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
