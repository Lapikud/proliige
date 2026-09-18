import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createCategoryService } from "~/core/services/category";
import { createPhotoService } from "~/core/services/photo";
import { createProofService } from "~/core/services/proof";
import { createTaskService, type TaskInput } from "~/core/services/task";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createLeaderboardRepository } from "~/infra/db/points/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { createTaskRepository } from "~/infra/db/task/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { createMemoryObjectStorage } from "~/infra/storage/memory";
import { connect, fakeNotificationPort, noAdmins, seedUsers, truncateAll } from "./helpers";

const { client, db } = connect();
const users = createUserRepository(db);
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const proofs = createProofRepository(db);
const leaderboard = createLeaderboardRepository(db);

const categoryService = createCategoryService({ categories });
const taskService = createTaskService({ tasks });
const proofService = createProofService({
  proofs,
  tasks,
  photos: createPhotoService({
    storage: createMemoryObjectStorage(),
    proofs,
  }),
  admins: noAdmins,
  notifications: fakeNotificationPort(),
  clock: {
    now: () => new Date(),
  },
});

afterAll(async () => {
  await client.end();
});

beforeEach(async () => {
  await truncateAll(db);
});

const taskFields = (categoryId: string): TaskInput => ({
  title: "Sneaky",
  description: "",
  categoryId,
  points: 999,
  policy: "one_per_user",
  cooldownSeconds: 0,
  photoRequired: false,
  photoInstructions: "",
});

async function seed() {
  const category = await categories.create({
    name: "General",
    slug: "general",
  });
  const task = await tasks.create({
    ...taskFields(category.id),
    title: "A task",
    points: 5,
    cooldownSeconds: null,
    photoInstructions: null,
  });
  const people = await seedUsers(users);
  const proof = await proofs.createPendingProof({
    taskId: task.id,
    userId: people.alice.id,
    photos: [],
    now: new Date(),
  });

  return {
    ...people,
    category,
    task,
    proof,
  };
}

describe("reviewing proofs is admin-only", () => {
  it.each(["listPendingProofs", "listReviewedProofs"] as const)(
    "refuses %s to a user",
    async (method) => {
      const { alice } = await seed();
      await expect(proofService[method](alice)).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );

  it.each(["listPendingProofs", "listReviewedProofs"] as const)(
    "refuses %s to a visitor",
    async (method) => {
      await seed();
      await expect(proofService[method](null)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    },
  );

  it("refuses approval and rejection to a user", async () => {
    const { bob, proof } = await seed();
    await expect(proofService.approveProof(bob, proof.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      proofService.rejectProof(bob, {
        proofId: proof.id,
        reason: "no",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("leaves a proof pending, with no points awarded, when its owner tries to approve it", async () => {
    const { alice, proof } = await seed();

    await expect(proofService.approveProof(alice, proof.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect((await proofs.findById(proof.id))?.status).toBe("pending");
    expect(await leaderboard.leaderboard()).toEqual([]);
  });

  it("refuses reviews to a visitor", async () => {
    const { proof } = await seed();
    await expect(proofService.approveProof(null, proof.id)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("lets an admin see the queue and approve", async () => {
    const { admin, proof } = await seed();

    const pending = await proofService.listPendingProofs(admin);
    expect(pending.map((entry) => entry.proof.id)).toEqual([proof.id]);

    const result = await proofService.approveProof(admin, proof.id);
    expect(result).toMatchObject({
      alreadyReviewed: false,
      pointsAwarded: 5,
    });
  });
});

describe("task and category management is admin-only", () => {
  it("refuses creating, updating and archiving to a user", async () => {
    const { alice, category, task } = await seed();

    await expect(taskService.createTask(alice, taskFields(category.id))).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      taskService.updateTask(alice, task.id, taskFields(category.id)),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(taskService.archiveTask(alice, task.id, true)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("leaves the task unchanged after a refused update", async () => {
    const { alice, category, task } = await seed();

    await expect(
      taskService.updateTask(alice, task.id, taskFields(category.id)),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(await tasks.findById(task.id)).toMatchObject({
      title: "A task",
      points: 5,
    });
  });

  it("refuses category management to a user", async () => {
    const { alice, category } = await seed();

    await expect(categoryService.listCategories(alice)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(categoryService.createCategory(alice, { name: "Nope" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      categoryService.updateCategory(alice, category.id, { name: "Nope" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("refuses all management to a visitor", async () => {
    const { category } = await seed();

    await expect(taskService.listAllTasks(null)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(taskService.createTask(null, taskFields(category.id))).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("lets an admin create and update tasks and categories", async () => {
    const { admin, category, task } = await seed();

    const created = await taskService.createTask(admin, taskFields(category.id));
    expect(created).toMatchObject({
      title: "Sneaky",
      points: 999,
    });

    const updated = await taskService.updateTask(admin, task.id, {
      ...taskFields(category.id),
      title: "Renamed",
    });
    expect(updated).toMatchObject({
      id: task.id,
      title: "Renamed",
    });

    const cleaning = await categoryService.createCategory(admin, { name: "Cleaning" });
    expect(cleaning).toMatchObject({
      name: "Cleaning",
      slug: "cleaning",
    });

    const renamed = await categoryService.updateCategory(admin, cleaning.id, {
      name: "Deep cleaning",
    });
    expect(renamed).toMatchObject({
      id: cleaning.id,
      name: "Deep cleaning",
      slug: "deep-cleaning",
    });
  });
});

describe("task browsing requires a member group", () => {
  it("refuses someone in no configured group", async () => {
    const { outsider } = await seed();
    expect(outsider.roles).toEqual([]);
    await expect(taskService.listOpenTasks(outsider)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a visitor", async () => {
    await seed();
    await expect(taskService.listOpenTasks(null)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("shows open tasks to members", async () => {
    const { alice, task } = await seed();

    const open = await taskService.listOpenTasks(alice);
    expect(open.map((item) => item.task.id)).toEqual([task.id]);
  });

  it("keeps admins out of tasks and proofs: they review, they do not submit", async () => {
    const { admin, task } = await seed();

    await expect(taskService.listOpenTasks(admin)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      proofService.submitProof(admin, {
        taskId: task.id,
        objectKeys: [],
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("roles come from groups, never from identity", () => {
  it("does not make someone an admin because their name says so", async () => {
    const impostor = await users.upsertFromIdentity({
      ipaUniqueId: "ipa-impostor",
      uid: "team_juhatus",
      displayName: "team_juhatus",
      groups: ["members"],
    });

    expect(impostor.roles).toEqual(["member"]);
    await expect(proofService.listPendingProofs(impostor)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("makes someone an admin as soon as they are in an admin group", async () => {
    const promoted = await users.upsertFromIdentity({
      ipaUniqueId: "ipa-carol",
      uid: "carol",
      displayName: "Carol",
      groups: ["members", "team_juhatus"],
    });

    expect(promoted.roles).toEqual(["admin"]);
    await expect(proofService.listPendingProofs(promoted)).resolves.toEqual([]);
  });
});
