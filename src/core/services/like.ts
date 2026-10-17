import { userCanReactToProofs } from "~/domain/rules";
import { guard } from "../guard";
import type { ClockPort } from "../ports/clock";
import type { LikeRepository } from "../ports/like";
import type { ProofRepository } from "../ports/proof";
import type { RecognitionRepository } from "../ports/recognition";
import { requirePost } from "./proofGuards";

interface Deps {
  readonly likes: LikeRepository;
  readonly proofs: ProofRepository;
  readonly recognitions: RecognitionRepository;
  readonly clock: ClockPort;
}

export function createLikeService({ likes, proofs, recognitions, clock }: Deps) {
  return {
    toggleLike: guard(userCanReactToProofs, async (user, proofId: string) => {
      const { post } = await requirePost(proofs, recognitions, proofId);

      return likes.toggleLike({
        post,
        userId: user.id,
        now: clock.now(),
      });
    }),
  };
}

export type LikeService = ReturnType<typeof createLikeService>;
