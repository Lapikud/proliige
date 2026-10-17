import type { PostRef } from "~/domain/feed";
import { isOnFeed } from "~/domain/proof";
import { userCanModeratePosts } from "~/domain/rules";
import type { User } from "~/domain/user";
import { forbidden, notFound } from "~/domain/errors";
import type { ProofRepository } from "../ports/proof";
import type { RecognitionRepository } from "../ports/recognition";

async function requireProofOnFeed(proofs: ProofRepository, proofId: string, user: User | null) {
  const found = await proofs.findForFeed(proofId);
  if (found === null) {
    throw notFound("That proof does not exist.");
  }
  if (found.proof.status !== "approved") {
    throw forbidden("You can only interact with completed tasks.");
  }
  if (!isOnFeed(found.proof, { showOnFeed: found.taskShowOnFeed }) && !userCanModeratePosts(user)) {
    throw notFound("That post is not on the feed.");
  }

  return found.proof;
}

export async function requirePost(
  proofs: ProofRepository,
  recognitions: RecognitionRepository,
  id: string,
  user: User | null,
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
  const proof = await requireProofOnFeed(proofs, id, user);

  return {
    post: {
      kind: "proof",
      id,
    },
    ownerId: proof.userId,
    taskId: proof.taskId,
  };
}
