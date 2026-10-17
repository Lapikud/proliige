import { describe, expect, it } from "vitest";
import { isOnFeed } from "~/domain/proof";
import {
  userCanAddOwnTask,
  userCanBrowseTasks,
  userCanDeleteComment,
  userCanManageCategories,
  userCanManageTasks,
  userCanReactToProofs,
  userCanReadNotifications,
  userCanReviewProofs,
  userCanSubmitProof,
  userCanSuggestTasks,
  userCanViewFeed,
  userCanViewLeaderboard,
  userCanViewProfiles,
  userCanViewPhoto,
} from "~/domain/rules";
import type { User } from "~/domain/user";

const person = (id: string, roles: User["roles"]): User => ({
  id,
  ipaUniqueId: `ipa-${id}`,
  uid: id,
  displayName: id,
  excluded: false,
  roles,
});

const visitor = null;
const ipauser = person("guest", []);
const alice = person("alice", ["member"]);
const bob = person("bob", ["member"]);
const pixel = person("pixel", ["member", "pixel"]);
const boss = person("boss", ["admin"]);

describe("capability rules", () => {
  it.each([
    ["userCanViewLeaderboard", userCanViewLeaderboard, [true, true, true, true, true]],
    ["userCanViewFeed", userCanViewFeed, [true, true, true, true, true]],
    ["userCanViewProfiles", userCanViewProfiles, [true, true, true, true, true]],
    ["userCanReadNotifications", userCanReadNotifications, [false, true, true, true, true]],
    ["userCanReactToProofs", userCanReactToProofs, [false, true, true, true, true]],
    ["userCanBrowseTasks", userCanBrowseTasks, [false, false, false, true, false]],
    ["userCanSubmitProof", userCanSubmitProof, [false, false, false, true, false]],
    ["userCanAddOwnTask", userCanAddOwnTask, [false, false, false, true, false]],
    ["userCanSuggestTasks", userCanSuggestTasks, [false, false, true, true, false]],
    ["userCanManageTasks", userCanManageTasks, [false, false, false, false, true]],
    ["userCanManageCategories", userCanManageCategories, [false, false, false, false, true]],
    ["userCanReviewProofs", userCanReviewProofs, [false, false, false, false, true]],
  ] as const)("%s: visitor / ipauser / member / pixel / admin", (_name, rule, expected) => {
    expect([rule(visitor), rule(ipauser), rule(alice), rule(pixel), rule(boss)]).toEqual(expected);
  });
});

describe("userCanDeleteComment", () => {
  const alicesComment = { userId: alice.id };

  it("lets the author delete their own comment", () => {
    expect(userCanDeleteComment(alice, alicesComment)).toBe(true);
  });

  it("stops another user deleting it", () => {
    expect(userCanDeleteComment(bob, alicesComment)).toBe(false);
  });

  it("lets an admin delete anyone's comment", () => {
    expect(userCanDeleteComment(boss, alicesComment)).toBe(true);
  });

  it("refuses visitors", () => {
    expect(userCanDeleteComment(visitor, alicesComment)).toBe(false);
  });
});

describe("userCanViewPhoto", () => {
  const proof = (onFeed: boolean) => ({
    userId: alice.id,
    onFeed,
  });

  it("makes photos on the feed public, visitors included", () => {
    expect(userCanViewPhoto(visitor, proof(true))).toBe(true);
    expect(userCanViewPhoto(bob, proof(true))).toBe(true);
  });

  it("keeps photos off the feed to the owner and admins", () => {
    expect(userCanViewPhoto(visitor, proof(false))).toBe(false);
    expect(userCanViewPhoto(bob, proof(false))).toBe(false);
    expect(userCanViewPhoto(alice, proof(false))).toBe(true);
    expect(userCanViewPhoto(boss, proof(false))).toBe(true);
  });
});

describe("isOnFeed", () => {
  const shown = { showOnFeed: true };

  it("shows approved proofs of tasks shown on the feed", () => {
    expect(
      isOnFeed(
        {
          status: "approved",
          hiddenAt: null,
        },
        shown,
      ),
    ).toBe(true);
  });

  it("leaves out pending, rejected and removed posts and tasks kept off the feed", () => {
    expect(
      isOnFeed(
        {
          status: "pending",
          hiddenAt: null,
        },
        shown,
      ),
    ).toBe(false);
    expect(
      isOnFeed(
        {
          status: "rejected",
          hiddenAt: null,
        },
        shown,
      ),
    ).toBe(false);
    expect(
      isOnFeed(
        {
          status: "approved",
          hiddenAt: new Date(),
        },
        shown,
      ),
    ).toBe(false);
    expect(
      isOnFeed(
        {
          status: "approved",
          hiddenAt: null,
        },
        { showOnFeed: false },
      ),
    ).toBe(false);
  });
});
