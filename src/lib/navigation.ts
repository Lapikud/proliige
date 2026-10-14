import {
  userCanBrowseTasks,
  userCanManageTasks,
  userCanReviewProofs,
  userCanSubmitProof,
} from "~/domain/rules";
import type { User } from "~/domain/user";

export interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: "feed" | "tasks" | "proofs" | "review" | "manage" | "profile" | "signIn";
  count?: number;
  only?: "desktop" | "mobile";
}

export function navItemsFor(user: User | null, reviewRequests = 0): Array<NavItem> {
  const items: Array<NavItem | false> = [
    {
      href: "/",
      label: "Feed",
      icon: "feed",
    },
    userCanBrowseTasks(user) && {
      href: "/tasks",
      label: "Tasks",
      icon: "tasks",
    },
    userCanSubmitProof(user) && {
      href: "/proofs",
      label: "My proofs",
      shortLabel: "Proofs",
      icon: "proofs",
    },
    userCanReviewProofs(user) && {
      href: "/admin/review",
      label: "Review",
      icon: "review",
      count: reviewRequests,
    },
    userCanManageTasks(user) && {
      href: "/admin/tasks",
      label: "Manage",
      icon: "manage",
    },
    user !== null && {
      href: `/users/${user.id}`,
      label: "Profile",
      icon: "profile",
      only: "mobile",
    },
    user === null && {
      href: "/login",
      label: "Sign in",
      icon: "signIn",
      only: "mobile",
    },
  ];

  return items.filter((item) => item !== false);
}

export function startPageFor(user: User): string {
  if (userCanReviewProofs(user)) {
    return "/admin/review";
  }
  if (userCanBrowseTasks(user)) {
    return "/tasks";
  }

  return "/";
}
