import { userCanReactToProofs } from "~/domain/rules";
import { guard } from "../guard";
import type { ClockPort } from "../ports/clock";
import type { LikeRepository } from "../ports/like";
import type { ProofRepository } from "../ports/proof";
import { requireApprovedProof } from "./proofGuards";

interface Deps {
  readonly likes: LikeRepository;
  readonly proofs: ProofRepository;
  readonly clock: ClockPort;
}

export function createLikeService({ likes, proofs, clock }: Deps) {
  return {
    toggleLike: guard(userCanReactToProofs, async (user, proofId: string) => {
      await requireApprovedProof(proofs, proofId);

      return likes.toggleLike({
        proofId,
        userId: user.id,
        now: clock.now(),
      });
    }),
  };
}

export type LikeService = ReturnType<typeof createLikeService>;
