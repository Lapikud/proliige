import type { PostRef } from "~/domain/feed";
import { forbidden, notFound } from "~/domain/errors";
import type { ProofRepository } from "../ports/proof";
import type { RecognitionRepository } from "../ports/recognition";

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

export async function requirePost(
  proofs: ProofRepository,
  recognitions: RecognitionRepository,
  id: string,
): Promise<{ post: PostRef; ownerId: string; taskId: string | null }> {
  const recognition = await recognitions.findById(id);
  if (recognition !== null) {
    return {
      post: {
        kind: "recognition",
        id,
      },
      ownerId: recognition.recipientId,
      taskId: null,
    };
  }
  const proof = await requireApprovedProof(proofs, id);

  return {
    post: {
      kind: "proof",
      id,
    },
    ownerId: proof.userId,
    taskId: proof.taskId,
  };
}
