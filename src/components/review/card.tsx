"use client";

import { Check, GitPullRequest, Pencil, X } from "lucide-react";
import { type FC, useState } from "react";
import { approveProofAction } from "~/actions/review";
import type { ProofStatus } from "~/domain/proof";
import type { Category } from "~/domain/task";
import { useAction } from "~/lib/form";
import { formatDateTime } from "~/lib/utils";
import { ProofStatusBadge } from "../proof/statusBadge";
import { PhotoGallery } from "../proof/photoGallery";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { ErrorState } from "../ui/feedback";
import { Input, Label, Select, Textarea } from "../ui/formControls";
import { UserText } from "../ui/markdown";
import type { PendingProofView } from "./model";
import { RejectForm } from "./rejectForm";
import { ReviewerList } from "./reviewers";

interface Props {
  proof: PendingProofView;
  categories: ReadonlyArray<Category>;
}

type Stage = "reviewing" | "rejecting" | Exclude<ProofStatus, "pending">;

export const ReviewCard: FC<Props> = ({ proof, categories }) => {
  const [stage, setStage] = useState<Stage>("reviewing");
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({
    title: proof.taskTitle,
    description: proof.taskDescription,
    categoryId: proof.categoryId,
    points: proof.points,
  });
  const { points } = edit;
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
            <h3 className="text-base font-black text-foreground">{proof.taskTitle}</h3>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{proof.userDisplayName}</span>{" "}
              {proof.ownTask ? "added their own task, suggests" : "wants"}{" "}
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

        {proof.ownTask && proof.taskDescription && (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground/85">
            {proof.taskDescription}
          </p>
        )}

        {proof.textAnswer && (
          <UserText
            text={proof.textAnswer}
            markdown={proof.textMarkdown}
            className="rounded-xl border border-border bg-muted px-4 py-3 text-sm leading-relaxed"
          />
        )}

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
          <div className="flex flex-col gap-3">
            {proof.ownTask && editing && (
              <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`title-${proof.proofId}`}>Title</Label>
                  <Input
                    id={`title-${proof.proofId}`}
                    maxLength={120}
                    value={edit.title}
                    onChange={(event) => {
                      setEdit({
                        ...edit,
                        title: event.target.value,
                      });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`description-${proof.proofId}`}>Details</Label>
                  <Textarea
                    id={`description-${proof.proofId}`}
                    rows={3}
                    maxLength={2000}
                    value={edit.description}
                    onChange={(event) => {
                      setEdit({
                        ...edit,
                        description: event.target.value,
                      });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`category-${proof.proofId}`}>Category</Label>
                  <Select
                    id={`category-${proof.proofId}`}
                    value={edit.categoryId}
                    onChange={(event) => {
                      setEdit({
                        ...edit,
                        categoryId: event.target.value,
                      });
                    }}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
            {proof.ownTask && (
              <div className="flex items-center gap-3">
                <Label htmlFor={`points-${proof.proofId}`}>Award points</Label>
                <Input
                  id={`points-${proof.proofId}`}
                  type="number"
                  min={0}
                  step={1}
                  className="w-24"
                  value={Number.isNaN(points) ? "" : points}
                  onChange={(event) => {
                    setEdit({
                      ...edit,
                      points: event.target.valueAsNumber,
                    });
                  }}
                />
                {!editing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      setEditing(true);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    Edit task
                  </Button>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                disabled={approve.pending}
                onClick={() => {
                  approve.run(
                    proof.ownTask
                      ? {
                          proofId: proof.proofId,
                          edit,
                        }
                      : { proofId: proof.proofId },
                  );
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
