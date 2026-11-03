import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createPhotoService } from "~/core/services/photo";
import { createProofService } from "~/core/services/proof";
import type { TaskPolicy } from "~/domain/task";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { tasks as taskTable } from "~/infra/db/task/model";
import { createTaskRepository } from "~/infra/db/task/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { createMemoryObjectStorage } from "~/infra/storage/memory";
import { connect, fakeNotificationPort, noAdmins, seedUsers, truncateAll } from "./helpers";

const { client, db } = connect();
const users = createUserRepository(db);
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const proofs = createProofRepository(db);
const now = new Date("2026-10-27T10:00:00Z");
const proofService = createProofService({
  proofs,
  tasks,
  photos: createPhotoService({
    storage: createMemoryObjectStorage(),
    proofs,
  }),
  notifications: fakeNotificationPort(),
  admins: noAdmins,
  clock: { now: () => now },
});

afterAll(async () => {
  await client.end();
});

beforeEach(async () => {
  await truncateAll(db);
});

async function seed() {
  const people = await seedUsers(users);
  const category = await categories.create({
    name: "General",
    slug: "general",
  });
  const otherCategory = await categories.create({
    name: "Other",
    slug: "other",
  });

  const submit = async (categoryId: string, policy: TaskPolicy, ownTask = false) => {
    const task = await tasks.create({
      title: "Test task",
      description: "",
      categoryId,
      points: 10,
      policy,
      cooldownSeconds: null,
      photoRequired: false,
      photoInstructions: null,
      textRequired: false,
      createdBy: ownTask ? people.alice.id : null,
    });

    return proofs.createPendingProof({
      taskId: task.id,
      userId: people.alice.id,
      photos: [],
      now,
    });
  };

  return {
    ...people,
    category,
    target: await submit(category.id, "repeatable"),
    own: await submit(category.id, "repeatable", true),
    once: await submit(category.id, "one_per_user"),
    other: await submit(otherCategory.id, "repeatable"),
  };
}

describe("review filters", () => {
  it("combines filters and distinguishes catalog tasks from own tasks", async () => {
    const { admin, category, target, own, once } = await seed();

    expect(await proofService.listPendingProofs(admin)).toHaveLength(4);
    expect(await proofService.listPendingProofs(admin, { categoryId: category.id })).toHaveLength(
      3,
    );
    expect(await proofService.listPendingProofs(admin, { ownTask: false })).toHaveLength(3);
    expect(await proofService.listPendingProofs(admin, { ownTask: true })).toMatchObject([
      { proof: { id: own.id } },
    ]);
    expect(await proofService.listPendingProofs(admin, { policy: "one_per_user" })).toMatchObject([
      { proof: { id: once.id } },
    ]);
    expect(
      await proofService.listPendingProofs(admin, {
        categoryId: category.id,
        policy: "repeatable",
        ownTask: false,
      }),
    ).toMatchObject([{ proof: { id: target.id } }]);
    expect(
      await proofService.listPendingProofs(admin, { categoryId: crypto.randomUUID() }),
    ).toEqual([]);
  });

  it("filters reviewed proofs before applying the history limit", async () => {
    const { admin, category, target, own, once, other } = await seed();
    for (const [index, proof] of [target, own, once, other].entries()) {
      await proofs.approve({
        proofId: proof.id,
        reviewerId: admin.id,
        now: new Date(now.getTime() + index * 1000),
      });
    }

    expect(await proofService.listReviewedProofs(admin, 1)).toMatchObject([
      { proof: { id: other.id } },
    ]);
    expect(
      await proofService.listReviewedProofs(admin, 1, {
        categoryId: category.id,
        policy: "repeatable",
        ownTask: false,
      }),
    ).toMatchObject([{ proof: { id: target.id } }]);
  });

  it("uses the policy recorded on the proof even after the task changes", async () => {
    const { admin, target } = await seed();
    await db
      .update(taskTable)
      .set({ policy: "one_per_user" })
      .where(eq(taskTable.id, target.taskId));

    const repeatable = await proofService.listPendingProofs(admin, { policy: "repeatable" });
    const once = await proofService.listPendingProofs(admin, { policy: "one_per_user" });

    expect(repeatable.map(({ proof }) => proof.id)).toContain(target.id);
    expect(once.map(({ proof }) => proof.id)).not.toContain(target.id);
  });

  it("filters reported proofs and excludes resolved reports", async () => {
    const { admin, bob, category, target, own, once, other } = await seed();
    for (const proof of [target, own, once, other]) {
      await proofs.approve({
        proofId: proof.id,
        reviewerId: admin.id,
        now,
      });
      await proofs.report({
        proofId: proof.id,
        reporterId: bob.id,
        reason: "Check this",
        now,
      });
    }
    await proofs.dismissReports({
      proofId: own.id,
      resolvedBy: admin.id,
      now,
    });

    expect(await proofService.listReportedProofs(admin)).toHaveLength(3);
    expect(
      await proofService.listReportedProofs(admin, {
        categoryId: category.id,
        policy: "repeatable",
        ownTask: false,
      }),
    ).toMatchObject([{ proof: { id: target.id } }]);
    expect(await proofService.listReportedProofs(admin, { ownTask: true })).toEqual([]);
  });
});
