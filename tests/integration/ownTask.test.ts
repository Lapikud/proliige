import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createProofService } from "~/core/services/proof";
import { createPhotoService } from "~/core/services/photo";
import { createMemoryObjectStorage } from "~/infra/storage/memory";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createLeaderboardRepository } from "~/infra/db/points/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { createTaskRepository } from "~/infra/db/task/repo";
import { connect, fakeNotificationPort, noAdmins, truncateAll } from "./helpers";

const { client, db } = connect();
const users = createUserRepository(db);
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const proofs = createProofRepository(db);
const leaderboard = createLeaderboardRepository(db);
const proofService = createProofService({
  proofs,
  tasks,
  photos: createPhotoService({
    storage: createMemoryObjectStorage(),
    proofs,
  }),
  notifications: fakeNotificationPort(),
  admins: noAdmins,
  clock: { now: () => new Date() },
});

afterAll(async () => {
  await client.end();
});
beforeEach(async () => {
  await truncateAll(db);
});

async function seed() {
  const category = await categories.create({
    name: "General",
    slug: "general",
  });
  const signUp = (uid: string, groups: Array<string>) =>
    users.upsertFromIdentity({
      ipaUniqueId: `ipa-${uid}`,
      uid,
      displayName: uid,
      groups,
    });

  return {
    category,
    pixel: await signUp("pixel", ["pixels"]),
    member: await signUp("member", ["members"]),
    guest: await signUp("guest", []),
    admin: await signUp("boss", ["team_juhatus"]),
  };
}

const ownTask = (categoryId: string) => ({
  title: "Fixed the door",
  description: "It squeaked.",
  categoryId,
  points: 8,
  objectKeys: [],
  reviewerIds: [],
});

describe("own tasks", () => {
  it("lets members and pixels suggest one, but not users without a group", async () => {
    const { category, member, pixel, guest } = await seed();

    await expect(proofService.addOwnTask(member, ownTask(category.id))).resolves.toBeDefined();
    await expect(proofService.addOwnTask(pixel, ownTask(category.id))).resolves.toBeDefined();
    await expect(proofService.addOwnTask(guest, ownTask(category.id))).rejects.toThrow();
  });

  it("stays off the task lists and awards the admin's points", async () => {
    const { category, pixel, admin } = await seed();

    const proof = await proofService.addOwnTask(pixel, ownTask(category.id));
    expect(await tasks.listActive(pixel.id)).toEqual([]);
    expect(await tasks.listAll()).toEqual([]);

    const [pending] = await proofService.listPendingProofs(admin);
    expect(pending?.ownTask).toBe(true);
    expect(pending?.taskPoints).toBe(8);

    const result = await proofService.approveProof(admin, proof.id, 12);
    expect(result.pointsAwarded).toBe(12);
    expect((await proofs.findWithContext(proof.id))?.taskPoints).toBe(12);
    expect((await leaderboard.leaderboard())[0]?.totalPoints).toBe(12);
  });

  it("refuses a points override on a regular task", async () => {
    const { category, pixel, admin } = await seed();
    const task = await tasks.create({
      title: "Take out the trash",
      description: "",
      categoryId: category.id,
      points: 10,
      policy: "one_per_user",
      cooldownSeconds: null,
      photoRequired: false,
      photoInstructions: null,
      textRequired: false,
    });
    const proof = await proofService.submitProof(pixel, {
      taskId: task.id,
      objectKeys: [],
    });

    await expect(proofService.approveProof(admin, proof.id, 99)).rejects.toThrow(/own tasks/);
  });

  it("closes a rejected own task", async () => {
    const { category, pixel, admin } = await seed();
    const proof = await proofService.addOwnTask(pixel, ownTask(category.id));

    await proofService.rejectProof(admin, {
      proofId: proof.id,
      reason: null,
    });

    await expect(
      proofService.submitProof(pixel, {
        taskId: proof.taskId,
        objectKeys: [],
      }),
    ).rejects.toThrow(/archived/);
  });

  it("removes the task when the proof fails", async () => {
    const { category, pixel } = await seed();

    await expect(
      proofService.addOwnTask(pixel, {
        ...ownTask(category.id),
        objectKeys: ["someone-else/x.jpg"],
      }),
    ).rejects.toThrow();
    expect(await tasks.listAll()).toEqual([]);
    expect(await db.query.tasks.findMany()).toEqual([]);
  });
});
