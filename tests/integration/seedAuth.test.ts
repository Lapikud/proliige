import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeedAuthentication } from "~/infra/auth/seed";
import { createUserRepository } from "~/infra/db/user/repo";
import { connect, truncateAll } from "./helpers";

const { client, db } = connect();
const users = createUserRepository(db);
const authentication = createSeedAuthentication(db);

afterAll(async () => client.end());
beforeEach(async () => truncateAll(db));
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("seed sign-in", () => {
  it("signs in seeded accounts with their stored groups and nobody else", async () => {
    await users.upsertFromIdentity({
      ipaUniqueId: "seed-seed-pixel-1",
      uid: "seed-pixel-1",
      displayName: "Seed Pixel 1",
      groups: ["pixels"],
    });
    await users.upsertFromIdentity({
      ipaUniqueId: "ipa-real",
      uid: "real",
      displayName: "Real",
      groups: ["pixels"],
    });

    await expect(authentication.authenticate("seed-pixel-1", "seed")).resolves.toMatchObject({
      ok: true,
      identity: {
        uid: "seed-pixel-1",
        displayName: "Seed Pixel 1",
        groups: ["pixels"],
      },
    });
    await expect(authentication.authenticate("seed-pixel-1", "wrong")).resolves.toMatchObject({
      ok: false,
    });
    await expect(authentication.authenticate("real", "seed")).resolves.toMatchObject({ ok: false });
  });

  it("refuses everyone in production", async () => {
    await users.upsertFromIdentity({
      ipaUniqueId: "seed-seed-admin-1",
      uid: "seed-admin-1",
      displayName: "Seed Admin 1",
      groups: ["team_juhatus"],
    });
    vi.stubEnv("NODE_ENV", "production");

    await expect(authentication.authenticate("seed-admin-1", "seed")).resolves.toMatchObject({
      ok: false,
    });
  });
});
