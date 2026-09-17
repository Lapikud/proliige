import { forbidden, notFound } from "~/domain/errors";
import type { ProofRepository } from "../ports/proof";

export async function requireApprovedProof(proofs: ProofRepository, proofId: string) {
  const proof = await proofs.findById(proofId);
  if (proof === null) {
    throw notFound("That proof does not exist.");
  }
  if (proof.status !== "approved") {
    throw forbidden("You can only interact with completed tasks.");
  }

  return proof;
}
