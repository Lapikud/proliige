import type { FC } from "react";
import type { ProofStatus } from "~/domain/proof";
import { Badge } from "../ui/badge";

const labels: Record<ProofStatus, string> = {
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
};

interface Props {
  status: ProofStatus;
}

export const ProofStatusBadge: FC<Props> = ({ status }) => (
  <Badge variant={status}>{labels[status]}</Badge>
);
