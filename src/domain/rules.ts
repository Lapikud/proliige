import type { ProofStatus } from "./proof";
import { hasRole, type User } from "./user";

export type Rule = (user: User | null) => user is User;

export type PublicRule = (user: User | null) => boolean;

const everyone: PublicRule = () => true;
const signedIn: Rule = (user): user is User => user !== null;
const member: Rule = (user): user is User => hasRole(user, "member");
const admin: Rule = (user): user is User => hasRole(user, "admin");

const isAdmin = (user: User | null): boolean => hasRole(user, "admin");

export const userCanViewLeaderboard: PublicRule = everyone;
export const userCanViewFeed: PublicRule = everyone;
export const userCanViewProfiles: PublicRule = everyone;

export const userCanReadNotifications: Rule = signedIn;
export const userCanReactToProofs: Rule = signedIn;

export const userCanBrowseTasks: Rule = member;
export const userCanSubmitProof: Rule = member;

export const userCanManageTasks: Rule = admin;
export const userCanManageCategories: Rule = admin;
export const userCanReviewProofs: Rule = admin;

export function userCanDeleteComment(user: User | null, comment: { userId: string }): boolean {
  return isAdmin(user) || user?.id === comment.userId;
}

export function userCanViewPhoto(
  user: User | null,
  proof: {
    status: ProofStatus;
    userId: string;
  },
): boolean {
  return proof.status === "approved" || isAdmin(user) || user?.id === proof.userId;
}
