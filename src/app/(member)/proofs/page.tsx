import type { Metadata } from "next";
import Link from "next/link";
import type { FC } from "react";
import { MyProofRow } from "~/components/proof/myRow";
import { Accordion, GroupAccordionItem } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/feedback";
import { Page } from "~/components/ui/page";
import type { ProofStatus } from "~/domain/proof";
import { proofService } from "~/infra";
import { userCanSubmitProof } from "~/domain/rules";
import { requireUser } from "~/lib/user";

export const metadata: Metadata = { title: "My proofs" };

const sections: ReadonlyArray<{ status: ProofStatus; title: string }> = [
  {
    status: "rejected",
    title: "Rejected",
  },
  {
    status: "pending",
    title: "Awaiting review",
  },
  {
    status: "approved",
    title: "Approved",
  },
];

const ProofsPage: FC = async () => {
  const entries = await proofService.listMyProofs(await requireUser(userCanSubmitProof));
  const groups = sections
    .map((section) => ({
      ...section,
      entries: entries.filter((entry) => entry.proof.status === section.status),
    }))
    .filter((group) => group.entries.length > 0);

  return (
    <Page title="My proofs" description="Points are awarded once an admin approves a proof.">
      {entries.length === 0 && (
        <EmptyState
          title="You have not submitted anything yet"
          description="Pick something from the task list to get started."
        >
          <Button asChild variant="outline">
            <Link href="/tasks">Browse tasks</Link>
          </Button>
        </EmptyState>
      )}
      <Accordion
        type="multiple"
        className="flex flex-col gap-4"
        defaultValue={groups
          .filter((group) => group.status !== "approved" || groups.length === 1)
          .map((group) => group.status)}
      >
        {groups.map((group) => (
          <GroupAccordionItem
            key={group.status}
            value={group.status}
            title={
              <span className="min-w-0 truncate text-lg">
                {group.title}{" "}
                <span className="text-sm font-medium text-muted-foreground tabular-nums">
                  · {group.entries.length}
                </span>
              </span>
            }
          >
            <ul className="list-none px-2 py-1">
              {group.entries.map((entry) => (
                <li key={entry.proof.id} className="border-b border-border/70 last:border-b-0">
                  <MyProofRow entry={entry} />
                </li>
              ))}
            </ul>
          </GroupAccordionItem>
        ))}
      </Accordion>
    </Page>
  );
};

export default ProofsPage;
