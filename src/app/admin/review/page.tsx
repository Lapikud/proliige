import type { Metadata } from "next";
import Link from "next/link";
import type { FC } from "react";
import { ReviewCard } from "~/components/review/card";
import type { PendingProofView } from "~/components/review/model";
import { HistoryRow } from "~/components/review/historyRow";
import { Accordion, GroupAccordionItem } from "~/components/ui/accordion";
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
    taskDescription,
    ownTask,
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
  taskDescription,
  ownTask,
  categoryName,
  points: taskPoints,
  userDisplayName,
  submittedAt: proof.submittedAt.toISOString(),
  textAnswer: proof.textAnswer,
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
  const historyGroups = (["approved", "rejected"] as const)
    .map((status) => ({
      status,
      title: status === "approved" ? "Approved" : "Rejected",
      entries: history.filter((entry) => entry.proof.status === status),
    }))
    .filter((group) => group.entries.length > 0);

  return (
    <Page
      title="Reviews"
      description="Points are awarded only once a proof is approved."
      className="lg:h-[calc(100dvh-var(--nav-h)-5rem)]"
    >
      <div className="grid gap-6 lg:-mx-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[minmax(0,1fr)]">
        <section aria-labelledby="pending-heading" className="flex flex-col gap-3 lg:min-h-0">
          <h2 id="pending-heading" className="sr-only">
            Pending proofs
          </h2>
          <nav aria-label="Review queue" className="flex gap-1 border-b border-border lg:mx-3">
            <QueueTab
              href="/admin/review?view=requested"
              active={!showAll}
              count={requested.length}
            >
              Review requested
            </QueueTab>
            <QueueTab href="/admin/review?view=all" active={showAll} count={views.length}>
              All pending
            </QueueTab>
          </nav>

          <div tabIndex={0} className={scrollArea}>
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
          </div>
        </section>

        <section aria-labelledby="history-heading" className="flex flex-col gap-3 lg:min-h-0">
          <h2
            id="history-heading"
            className="flex min-h-11 items-center border-b border-border text-xl font-black lg:mx-3"
          >
            Recently reviewed
          </h2>
          <div tabIndex={0} className={scrollArea}>
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground">No proofs have been reviewed yet.</p>
            )}
            <Accordion
              type="multiple"
              className="flex flex-col gap-4"
              defaultValue={historyGroups.map((group) => group.status)}
            >
              {historyGroups.map((group) => (
                <GroupAccordionItem
                  key={group.status}
                  value={group.status}
                  heading="h3"
                  title={
                    <span className="min-w-0 truncate text-base">
                      {group.title}{" "}
                      <span className="text-sm font-medium text-muted-foreground tabular-nums">
                        · {group.entries.length}
                      </span>
                    </span>
                  }
                >
                  <ul className="list-none px-2 py-1">
                    {group.entries.map((entry) => (
                      <li
                        key={entry.proof.id}
                        className="border-b border-border/70 last:border-b-0"
                      >
                        <HistoryRow entry={entry} />
                      </li>
                    ))}
                  </ul>
                </GroupAccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </div>
    </Page>
  );
};

const scrollArea =
  "flex [scrollbar-width:none] flex-col gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:[mask-image:linear-gradient(to_bottom,black_calc(100%-2rem),transparent)] lg:px-3 lg:pt-1 lg:pb-8";

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
      "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm",
      active
        ? "border-primary font-black text-foreground"
        : "border-transparent font-bold text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
    <span
      className={cn(
        "rounded-full px-2 text-xs font-bold tabular-nums",
        active ? "bg-primary/20 text-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {count}
    </span>
  </Link>
);

export default ReviewPage;
