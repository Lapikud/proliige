"use client";

import { useState } from "react";
import type { FC } from "react";
import type { ProofWithContext } from "~/core/ports/proof";
import { formatDateTime } from "~/lib/utils";
import { UserAvatar } from "../ui/avatar";
import { PhotoGallery } from "../proof/photoGallery";
import { Badge } from "../ui/badge";
import { ProofStatusBadge } from "../proof/statusBadge";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

interface Props {
  entry: ProofWithContext;
}

export const HistoryRow: FC<Props> = ({ entry }) => {
  const [open, setOpen] = useState(false);
  const {
    proof,
    taskTitle,
    proofPolicy,
    taskDescription,
    taskPoints,
    taskRemoved,
    taskRemovedAt,
    taskRemovedByName,
    pointsReversed,
    pointsAwardedAt,
    pointsReversedAt,
    ownTask,
    categoryName,
    userDisplayName,
    reviewedByName,
    photos,
    requestedReviewers,
  } = entry;
  const photoUrls = photos.map((photo) => `/api/photos/${proof.id}/${photo.id}`);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="h-auto min-h-0 w-full flex-wrap justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm whitespace-normal text-foreground shadow-card hover:bg-muted"
        onClick={() => {
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-label={`View proof history for ${userDisplayName}: ${taskTitle}`}
      >
        <span className="min-w-0 flex-1 break-words">
          <span className="font-medium">{userDisplayName}</span> · {taskTitle}
          {taskRemoved && (
            <Badge variant="neutral" className="ml-2 align-middle">
              Removed task
            </Badge>
          )}
          {ownTask && (
            <Badge variant="brand" className="ml-2 align-middle">
              Own task
            </Badge>
          )}
          {proof.rejectionReason && (
            <span className="text-muted-foreground"> — {proof.rejectionReason}</span>
          )}
        </span>
        <ProofStatusBadge status={proof.status} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(90dvh,800px)] overflow-y-auto">
          <header className="flex items-start gap-3">
            <UserAvatar name={userDisplayName} className="size-11 shrink-0" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-black">Proof audit details</DialogTitle>
              <DialogDescription className="mt-1">
                Submitted by {userDisplayName} for {taskTitle}.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
              }}
            >
              Close
            </Button>
          </header>

          <section className="mt-5 grid gap-4 text-sm sm:grid-cols-2" aria-label="Proof history">
            <AuditField label="Member">{userDisplayName}</AuditField>
            <AuditField label="Task">
              {taskTitle}
              {taskRemoved ? " (removed)" : ""}
            </AuditField>
            <AuditField label="Category">{categoryName}</AuditField>
            <AuditField label="Status">
              <span className="capitalize">{proof.status}</span> ·{" "}
              {proofPolicy.replaceAll("_", " ")}
              {proof.status === "approved" && pointsReversed && " · Points reversed"}
            </AuditField>
            <AuditField label="Submitted">
              <time dateTime={proof.submittedAt.toISOString()}>
                {formatDateTime(proof.submittedAt)}
              </time>
            </AuditField>
            <AuditField label={proof.status === "approved" ? "Approved by" : "Reviewed by"}>
              {reviewedByName ?? "An admin"}
              {proof.reviewedAt && (
                <span className="block text-xs text-muted-foreground">
                  <time dateTime={proof.reviewedAt.toISOString()}>
                    {formatDateTime(proof.reviewedAt)}
                  </time>
                </span>
              )}
            </AuditField>
            <AuditField label="Points">
              {proof.status !== "approved" || taskPoints <= 0
                ? "No points awarded"
                : pointsReversed
                  ? `${taskPoints} points; subsequently reversed`
                  : `${taskPoints} points awarded`}
              {pointsAwardedAt && proof.status === "approved" && taskPoints > 0 && (
                <span className="block text-xs text-muted-foreground">
                  Credited{" "}
                  <time dateTime={pointsAwardedAt.toISOString()}>
                    {formatDateTime(pointsAwardedAt)}
                  </time>
                </span>
              )}
              {pointsReversedAt && pointsReversed && (
                <span className="block text-xs text-muted-foreground">
                  Reversed{" "}
                  <time dateTime={pointsReversedAt.toISOString()}>
                    {formatDateTime(pointsReversedAt)}
                  </time>
                </span>
              )}
            </AuditField>
            {taskRemovedAt && (
              <AuditField label="Task removed">
                {taskRemovedByName ?? "An admin"} ·{" "}
                <time dateTime={taskRemovedAt.toISOString()}>{formatDateTime(taskRemovedAt)}</time>
              </AuditField>
            )}
            {ownTask && <AuditField label="Task type">Member-created task</AuditField>}
            {taskDescription && <AuditField label="Task description">{taskDescription}</AuditField>}
          </section>

          {proof.textAnswer && (
            <section className="mt-5">
              <h3 className="mb-2 text-sm font-bold">Member’s written proof</h3>
              <p className="rounded-xl border border-border bg-muted px-3 py-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
                {proof.textAnswer}
              </p>
            </section>
          )}

          {proof.rejectionReason && (
            <section className="mt-5">
              <h3 className="mb-2 text-sm font-bold">Review note / rejection reason</h3>
              <p className="rounded-xl bg-destructive-soft px-3 py-3 text-sm text-destructive">
                {proof.rejectionReason}
              </p>
            </section>
          )}

          {requestedReviewers.length > 0 && (
            <section className="mt-5">
              <h3 className="mb-2 text-sm font-bold">Reviewers requested</h3>
              <p className="text-sm text-muted-foreground">
                {requestedReviewers.map((reviewer) => reviewer.displayName).join(", ")}
              </p>
            </section>
          )}

          {photoUrls.length > 0 && (
            <section className="mt-5">
              <h3 className="mb-2 text-sm font-bold">Submitted photos ({photoUrls.length})</h3>
              <PhotoGallery
                urls={photoUrls}
                alt={`Proof submitted by ${userDisplayName}`}
                size="md"
                layout="grid"
              />
              <ul className="mt-3 flex list-none flex-col gap-1 p-0 text-xs text-muted-foreground">
                {photos.map((photo) => (
                  <li key={photo.id}>
                    {photo.contentType} · {photo.sizeBytes.toLocaleString()} bytes · uploaded{" "}
                    <time dateTime={photo.uploadedAt.toISOString()}>
                      {formatDateTime(photo.uploadedAt)}
                    </time>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">
            Proof ID: <code className="break-all">{proof.id}</code>
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

const AuditField: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{label}</h3>
    <div className="mt-1 break-words">{children}</div>
  </div>
);
