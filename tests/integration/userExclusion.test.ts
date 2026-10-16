import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createUserService } from "~/core/services/user";
import { createUserRepository } from "~/infra/db/user/repo";
import { connect, truncateAll } from "./helpers";

const { client, db } = connect();
const users = createUserRepository(db);
const userService = createUserService({ users });

afterAll(async () => {
  await client.end();
});

beforeEach(async () => {
  await truncateAll(db);
});

describe("user public-view exclusion", () => {
  it("allows admins to exclude and restore, but rejects members and visitors", async () => {
    const target = await users.upsertFromIdentity({
      ipaUniqueId: "ipa-target",
      uid: "target",
      displayName: "Target",
      groups: ["pixels"],
    });
    const admin = await users.upsertFromIdentity({
      ipaUniqueId: "ipa-admin",
      uid: "admin",
      displayName: "Admin",
      groups: ["team_juhatus"],
    });
    const member = await users.upsertFromIdentity({
      ipaUniqueId: "ipa-member",
      uid: "member",
      displayName: "Member",
      groups: ["pixels"],
    });

    await expect(userService.setExcluded(member, target.id, true)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(userService.setExcluded(null, target.id, true)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(await userService.setExcluded(admin, target.id, true)).toMatchObject({ excluded: true });
    expect(await userService.setExcluded(admin, target.id, false)).toMatchObject({
      excluded: false,
    });
    await expect(
      userService.setExcluded(admin, "00000000-0000-4000-8000-000000000000", true),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("defaults new profiles to included and allows explicit excluded lookup", async () => {
    const user = await users.upsertFromIdentity({
      ipaUniqueId: "ipa-exclusion",
      uid: "exclusion",
      displayName: "Excluded candidate",
      groups: ["pixels"],
    });

    expect(await users.findById(user.id)).toMatchObject({
      id: user.id,
      displayName: "Excluded candidate",
      excluded: false,
    });

    await users.setExcluded({
      userId: user.id,
      excluded: true,
    });

    expect(await users.findById(user.id)).toBeNull();
    expect(await userService.findProfile(null, user.id)).toBeNull();
    const publicProfile = await userService.findProfile(null, user.id, { includeExcluded: true });
    expect(publicProfile).toMatchObject({
      id: user.id,
      excluded: true,
    });
    expect(publicProfile).not.toHaveProperty("ipaUniqueId");
    expect(publicProfile).not.toHaveProperty("uid");
    expect(publicProfile).not.toHaveProperty("roles");
    expect(await users.findById(user.id, { includeExcluded: true })).toMatchObject({
      id: user.id,
      displayName: "Excluded candidate",
      excluded: true,
      roles: ["member", "pixel"],
    });
  });

  it("preserves exclusion across identity upserts and can restore a profile", async () => {
    const user = await users.upsertFromIdentity({
      ipaUniqueId: "ipa-exclusion",
      uid: "exclusion",
      displayName: "Before",
      groups: ["pixels"],
    });

    await users.setExcluded({
      userId: user.id,
      excluded: true,
    });
    const updated = await users.upsertFromIdentity({
      ipaUniqueId: "ipa-exclusion",
      uid: "exclusion",
      displayName: "After",
      groups: ["pixels"],
    });

    expect(updated.id).toBe(user.id);
    expect(await users.findById(user.id)).toBeNull();
    expect(
      await users.setExcluded({
        userId: user.id,
        excluded: false,
      }),
    ).toMatchObject({
      id: user.id,
      displayName: "After",
      excluded: false,
    });
  });
});
