import { Check, Circle, X } from "lucide-react";
import type { FC } from "react";
import type { ProofStatus } from "~/domain/proof";
import type { PublicUserView } from "~/domain/user";
import { UserAvatar } from "../ui/avatar";

interface ReviewerListProps {
  requested: ReadonlyArray<PublicUserView>;
  status: ProofStatus;
  reviewedByName: string | null;
}

export const ReviewerList: FC<ReviewerListProps> = ({ requested, status, reviewedByName }) => {
  const reviewedBySomeoneElse =
    reviewedByName !== null &&
    !requested.some((reviewer) => reviewer.displayName === reviewedByName);
  const rows = [
    ...requested.map((reviewer) => ({
      name: reviewer.displayName,
      state: reviewer.displayName === reviewedByName ? status : ("pending" as const),
    })),
    ...(reviewedBySomeoneElse
      ? [
          {
            name: reviewedByName,
            state: status,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="font-sans text-xs font-semibold text-muted-foreground">Reviewers</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {status === "pending" ? "Any admin can review this." : "No reviewer recorded."}
        </p>
      ) : (
        <ul className="flex list-none flex-col gap-1.5 p-0">
          {rows.map(({ name, state }) => (
            <li key={name} className="flex items-center gap-2 text-sm text-foreground">
              <UserAvatar name={name} />
              <span className="flex-1">{name}</span>
              <ReviewState state={state} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ReviewState: FC<{ state: ProofStatus }> = ({ state }) => {
  if (state === "approved") {
    return <Check aria-label="Approved" className="size-4 text-success" />;
  }
  if (state === "rejected") {
    return <X aria-label="Rejected" className="size-4 text-destructive" />;
  }

  return <Circle aria-label="Awaiting review" className="size-3 fill-primary text-primary" />;
};
