import type { Metadata } from "next";
import type { FC } from "react";
import { MyProofCard } from "~/components/proof/myCard";
import { EmptyState } from "~/components/ui/feedback";
import { Page } from "~/components/ui/page";
import { proofService } from "~/infra";
import { userCanSubmitProof } from "~/domain/rules";
import { requireUser } from "~/lib/user";

export const metadata: Metadata = { title: "My proofs" };

const ProofsPage: FC = async () => {
  const entries = await proofService.listMyProofs(await requireUser(userCanSubmitProof));

  return (
    <Page title="My proofs" description="Points are awarded once an admin approves a proof.">
      {entries.length === 0 && (
        <EmptyState
          title="You have not submitted anything yet"
          description="Pick something from the task list to get started."
        />
      )}
      <ul className="flex list-none flex-col gap-3 p-0">
        {entries.map((entry) => (
          <li key={entry.proof.id}>
            <MyProofCard entry={entry} />
          </li>
        ))}
      </ul>
    </Page>
  );
};

export default ProofsPage;
