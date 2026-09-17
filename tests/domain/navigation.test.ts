import { describe, expect, it } from "vitest";
import type { User } from "~/domain/user";
import { navItemsFor, startPageFor } from "~/lib/navigation";

const person = (roles: User["roles"]): User => ({
  id: "u1",
  ipaUniqueId: "ipa-u1",
  uid: "u1",
  displayName: "U",
  roles,
});

const visitor = null;
const ipauser = person([]);
const member = person(["member"]);
const admin = person(["admin"]);

const links = (user: User | null, where: "desktop" | "mobile") =>
  navItemsFor(user)
    .filter((item) => item.only === undefined || item.only === where)
    .map((item) => item.href);

describe("navItemsFor", () => {
  it.each([
    ["a visitor", visitor, ["/", "/login"]],
    ["a signed-in account in no group", ipauser, ["/", "/notifications"]],
    ["a member", member, ["/", "/tasks", "/proofs", "/notifications"]],
    ["an admin", admin, ["/", "/admin/review", "/admin/tasks", "/notifications"]],
  ] as const)("gives %s their phone tabs", (_who, user, expected) => {
    expect(links(user, "mobile")).toEqual(expected);
  });

  it("keeps the phone tab bar to five tabs or fewer for every role", () => {
    for (const user of [visitor, ipauser, member, admin]) {
      expect(links(user, "mobile").length).toBeLessThanOrEqual(5);
    }
  });

  it("puts Categories in the desktop nav only", () => {
    expect(links(admin, "desktop")).toContain("/admin/categories");
    expect(links(admin, "mobile")).not.toContain("/admin/categories");
  });

  it("shows the reviewer the number of reviews requested from them", () => {
    expect(navItemsFor(admin, 3).find((item) => item.href === "/admin/review")?.count).toBe(3);
  });
});

describe("startPageFor", () => {
  it.each([
    ["an admin", admin, "/admin/review"],
    ["a member", member, "/tasks"],
    ["a signed-in account in no group", ipauser, "/"],
  ] as const)("sends %s to the page their role is for", (_who, user, expected) => {
    expect(startPageFor(user)).toBe(expected);
  });
});
