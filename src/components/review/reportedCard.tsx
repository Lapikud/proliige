"use client";

import { Flag } from "lucide-react";
import { type FC, useState } from "react";
import { dismissReportsAction, setProofHiddenAction } from "~/actions/review";
import { useAction } from "~/lib/form";
import { formatDateTime } from "~/lib/utils";
import { PhotoGallery } from "../proof/photoGallery";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { ErrorState } from "../ui/feedback";
import { UserText } from "../ui/markdown";
import { UnapproveDialog } from "../feed/unapproveDialog";
import type { ReportedProofView } from "./model";

interface Props {
  proof: ReportedProofView;
}

export const ReportedCard: FC<Props> = ({ proof }) => {
  const [outcome, setOutcome] = useState<string | null>(null);
  const [unapproving, setUnapproving] = useState(false);
  const dismiss = useAction(dismissReportsAction, {
    onSuccess: () => {
      setOutcome("Reports dismissed. The post stays on the feed.");
    },
  });
  const hide = useAction(setProofHiddenAction, {
    onSuccess: () => {
      setOutcome("Removed from the feed. The points stay.");
    },
  });

  if (outcome !== null) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          {proof.userDisplayName} · {proof.taskTitle}: {outcome}
        </CardContent>
      </Card>
    );
  }

  const error = dismiss.error ?? hide.error;

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Flag aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="text-base font-black text-foreground">{proof.taskTitle}</h3>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{proof.userDisplayName}</span> ·{" "}
              <span className="font-mono">{proof.points} pts</span> · {proof.categoryName}
            </p>
          </div>
          {proof.hidden && (
            <Badge variant="neutral" className="shrink-0">
              Removed from feed
            </Badge>
          )}
        </div>

        <ul className="flex list-none flex-col gap-2 rounded-xl bg-muted p-3">
          {proof.reports.map((report) => (
            <li key={report.reporterId} className="text-sm">
              <span className="font-bold">{report.reporterName}</span>{" "}
              <time dateTime={report.createdAt} className="text-xs text-muted-foreground">
                {formatDateTime(report.createdAt)}
              </time>
              <p className="break-words whitespace-pre-wrap">{report.reason}</p>
            </li>
          ))}
        </ul>

        {proof.textAnswer && (
          <UserText
            text={proof.textAnswer}
            markdown={proof.textMarkdown}
            className="rounded-xl border border-border px-4 py-3 text-sm leading-relaxed"
          />
        )}

        <PhotoGallery
          urls={proof.photoUrls}
          alt={`Photos submitted by ${proof.userDisplayName}`}
          layout="grid"
        />

        {error && <ErrorState description={error} />}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="subtle"
            size="sm"
            disabled={dismiss.pending}
            onClick={() => {
              dismiss.run({ proofId: proof.proofId });
            }}
          >
            {dismiss.pending ? "Dismissing…" : "Dismiss"}
          </Button>
          {!proof.hidden && (
            <Button
              variant="subtle"
              size="sm"
              disabled={hide.pending}
              onClick={() => {
                hide.run({
                  proofId: proof.proofId,
                  hidden: true,
                });
              }}
            >
              {hide.pending ? "Removing…" : "Remove from feed"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-destructive"
            onClick={() => {
              setUnapproving(true);
            }}
          >
            Unapprove…
          </Button>
        </div>
      </CardContent>
      <UnapproveDialog
        proofId={proof.proofId}
        taskTitle={proof.taskTitle}
        points={proof.points}
        open={unapproving}
        onOpenChange={setUnapproving}
        onDone={() => {
          setUnapproving(false);
          setOutcome("Unapproved. The points were taken back.");
        }}
      />
    </Card>
  );
};
