import { describe, expect, it } from "vitest";
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
  userCanTrackProofs,
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
    ["userCanAddOwnTask", userCanAddOwnTask, [false, false, true, true, false]],
    ["userCanTrackProofs", userCanTrackProofs, [false, false, true, true, false]],
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
  const proof = (status: "pending" | "approved" | "rejected") => ({
    status,
    userId: alice.id,
  });

  it("makes approved photos public, visitors included", () => {
    expect(userCanViewPhoto(visitor, proof("approved"))).toBe(true);
    expect(userCanViewPhoto(bob, proof("approved"))).toBe(true);
  });

  it.each(["pending", "rejected"] as const)("keeps %s photos to the owner and admins", (status) => {
    expect(userCanViewPhoto(visitor, proof(status))).toBe(false);
    expect(userCanViewPhoto(bob, proof(status))).toBe(false);
    expect(userCanViewPhoto(alice, proof(status))).toBe(true);
    expect(userCanViewPhoto(boss, proof(status))).toBe(true);
  });
});
