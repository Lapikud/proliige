import { describe, expect, it } from "vitest";
import { rolesForGroups, toPublicUserView, type User } from "~/domain/user";

const config = {
  memberGroups: ["members"],
  adminGroups: ["team_juhatus"],
};

const user: User = {
  id: "m1",
  ipaUniqueId: "ipa-1",
  uid: "jdoe",
  displayName: "J. Doe",
  roles: ["member"],
};

describe("rolesForGroups", () => {
  it("grants member for a configured member group", () => {
    expect(rolesForGroups(["members"], config)).toEqual(["member"]);
  });

  it("grants only admin for a configured admin group", () => {
    expect(rolesForGroups(["team_juhatus"], config)).toEqual(["admin"]);
  });

  it("does not make an admin a member, even in a member group", () => {
    expect(rolesForGroups(["members", "team_juhatus"], config)).toEqual(["admin"]);
  });

  it("grants nothing for unrelated groups", () => {
    expect(rolesForGroups(["ipausers", "students"], config)).toEqual([]);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(rolesForGroups([" Members "], config)).toEqual(["member"]);
  });

  it("does not grant anything for an empty group list", () => {
    expect(rolesForGroups([], config)).toEqual([]);
  });

  it("uses the shipped defaults: pixels and members for members, team_juhatus for admins", () => {
    expect(rolesForGroups(["pixels"])).toEqual(["member"]);
    expect(rolesForGroups(["members"])).toEqual(["member"]);
    expect(rolesForGroups(["team_juhatus"])).toEqual(["admin"]);
    expect(rolesForGroups(["ipausers"])).toEqual([]);
  });
});

describe("toPublicUserView", () => {
  it("exposes only the id and display name", () => {
    const view = toPublicUserView(user);
    expect(view).toEqual({
      id: "m1",
      displayName: "J. Doe",
    });

    expect(Object.keys(view)).not.toContain("uid");
    expect(Object.keys(view)).not.toContain("ipaUniqueId");
  });
});
