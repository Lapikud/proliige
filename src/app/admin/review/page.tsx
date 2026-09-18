import type { Metadata } from "next";
import Link from "next/link";
import type { FC } from "react";
import { ReviewCard } from "~/components/review/card";
import type { PendingProofView } from "~/components/review/model";
import { ProofStatusBadge } from "~/components/proof/statusBadge";
import { EmptyState } from "~/components/ui/feedback";
import { Page } from "~/components/ui/page";
import type { ProofWithContext } from "~/core/ports/proof";
import { proofService } from "~/infra";
import { userCanReviewProofs } from "~/domain/rules";
import type { User } from "~/domain/user";
import { requireUser } from "~/lib/user";
import { cn } from "~/lib/utils";

export const metadata: Metadata = { title: "Reviews" };

const toPendingView = (
  {
    proof,
    taskTitle,
    taskPoints,
    categoryName,
    userDisplayName,
    photos,
    requestedReviewers,
  }: ProofWithContext,
  user: User,
): PendingProofView => ({
  proofId: proof.id,
  taskTitle,
  categoryName,
  points: taskPoints,
  userDisplayName,
  submittedAt: proof.submittedAt.toISOString(),
  photoUrls: photos.map((item) => `/api/photos/${proof.id}/${item.id}`),
  requestedReviewers,
  requestedFromMe: requestedReviewers.some((reviewer) => reviewer.id === user.id),
});

const ReviewPage: FC<PageProps<"/admin/review">> = async ({ searchParams }) => {
  const user = await requireUser(userCanReviewProofs);
  const [pending, history] = await Promise.all([
    proofService.listPendingProofs(user),
    proofService.listReviewedProofs(user, 25),
  ]);
  const views = pending.map((entry) => toPendingView(entry, user));
  const requested = views.filter((view) => view.requestedFromMe);
  const { view } = await searchParams;
  const showAll = view === "all" || (view === undefined && requested.length === 0);
  const shown = showAll ? views : requested;

  return (
    <Page title="Reviews" description="Points are awarded only once a proof is approved.">
      <nav aria-label="Review queue" className="flex gap-1 border-b border-border">
        <QueueTab href="/admin/review?view=requested" active={!showAll} count={requested.length}>
          Review requested
        </QueueTab>
        <QueueTab href="/admin/review?view=all" active={showAll} count={views.length}>
          All pending
        </QueueTab>
      </nav>

      {shown.length === 0 && (
        <EmptyState
          title={showAll ? "Nothing to review" : "No review requests"}
          description={
            showAll
              ? "New proofs will appear here as members submit them."
              : "When a member asks you to review a proof, it shows up here."
          }
        />
      )}
      <ul className="flex list-none flex-col gap-3 p-0">
        {shown.map((item) => (
          <li key={item.proofId}>
            <ReviewCard proof={item} />
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-black">Recently reviewed</h2>
        {history.length === 0 && (
          <p className="text-sm text-muted-foreground">No proofs have been reviewed yet.</p>
        )}
        <ul className="flex list-none flex-col gap-2 p-0">
          {history.map(({ proof, userDisplayName, taskTitle }) => (
            <li
              key={proof.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-card"
            >
              <span className="text-foreground">
                <span className="font-medium">{userDisplayName}</span> · {taskTitle}
                {proof.rejectionReason && (
                  <span className="text-muted-foreground"> — {proof.rejectionReason}</span>
                )}
              </span>
              <ProofStatusBadge status={proof.status} />
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
};

interface QueueTabProps {
  href: string;
  active: boolean;
  count: number;
  children: string;
}

const QueueTab: FC<QueueTabProps> = ({ href, active, count, children }) => (
  <Link
    href={href}
    aria-current={active ? "page" : undefined}
    className={cn(
      "-mb-px inline-flex min-h-11 items-center gap-2 border-b-[3px] px-3 text-sm",
      active
        ? "border-primary font-black text-foreground"
        : "border-transparent font-bold text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
    <span
      className={cn(
        "rounded-full px-2 font-mono text-[11px] tabular-nums",
        active ? "bg-foreground text-primary" : "bg-border text-foreground",
      )}
    >
      {count}
    </span>
  </Link>
);

export default ReviewPage;
