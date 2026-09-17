import type { ProofRepository } from "~/core/ports/proof";
import type { Database } from "../client";
import { createProofRead } from "./read";
import { createProofReview } from "./review";
import { createProofSubmit } from "./submit";

export function createProofRepository(db: Database): ProofRepository {
  return {
    ...createProofRead(db),
    ...createProofSubmit(db),
    ...createProofReview(db),
  };
}
