import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { moveTasksSchema, setTasksArchivedSchema } from "~/actions/task/schema";
import { createTaskService } from "~/core/services/task";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { pointsLedger } from "~/infra/db/points/model";
import { proofs } from "~/infra/db/proof/model";
import { createTaskRepository } from "~/infra/db/task/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { connect, seedUsers, truncateAll } from "./helpers";
import { first as firstRow } from "../support";

const { client, db } = connect();
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const users = createUserRepository(db);
const removalTime = new Date("2026-10-16T12:00:00Z");
const taskService = createTaskService({
  tasks,
  clock: { now: () => removalTime },
});

const taskInput = (categoryId: string, title: string) => ({
  title,
  description: "",
  categoryId,
  points: 5,
  policy: "one_per_user" as const,
  cooldownSeconds: 0,
  photoRequired: false,
  photoInstructions: "",
  textRequired: false,
  showOnFeed: true,
});

async function setup() {
  const people = await seedUsers(users);
  const source = await categories.create({
    name: "Source",
    slug: "source",
  });
  const destination = await categories.create({
    name: "Destination",
    slug: "destination",
  });
  const first = await tasks.create({
    ...taskInput(source.id, "First"),
    cooldownSeconds: null,
    photoInstructions: null,
    textRequired: false,
  });
  const second = await tasks.create({
    ...taskInput(source.id, "Second"),
    cooldownSeconds: null,
    photoInstructions: null,
    textRequired: false,
  });

  return {
    ...people,
    source,
    destination,
    first,
    second,
  };
}

afterAll(async () => {
  await client.end();
});

beforeEach(async () => {
  await truncateAll(db);
});

describe("task removal", () => {
  it("closes pending proofs and reverses exact approved credits atomically", async () => {
    const { admin, alice, first } = await setup();
    const pending = firstRow(
      await db
        .insert(proofs)
        .values({
          taskId: first.id,
          userId: alice.id,
          policy: first.policy,
          status: "pending",
        })
        .returning(),
    );
    const approved = firstRow(
      await db
        .insert(proofs)
        .values({
          taskId: first.id,
          userId: admin.id,
          policy: first.policy,
          status: "approved",
        })
        .returning(),
    );
    const awardedAt = new Date("2026-10-01T09:00:00Z");
    const credit = firstRow(
      await db
        .insert(pointsLedger)
        .values({
          userId: admin.id,
          proofId: approved.id,
          points: 9,
          awardedAt,
        })
        .returning(),
    );

    await taskService.removeTask(admin, first.id);
    await taskService.removeTask(admin, first.id);

    expect(await tasks.findById(first.id)).toMatchObject({
      removedAt: removalTime,
      removedBy: admin.id,
    });
    expect(await tasks.findDetail(first.id, alice.id)).toBeNull();
    expect((await tasks.listActive(alice.id)).some(({ task }) => task.id === first.id)).toBe(false);
    expect((await tasks.listAll()).some(({ task }) => task.id === first.id)).toBe(true);
    expect(await db.select().from(proofs).where(eq(proofs.id, pending.id))).toMatchObject([
      {
        status: "rejected",
        rejectionReason: "Task removed",
        reviewedBy: admin.id,
        reviewedAt: removalTime,
      },
    ]);
    expect(await db.select().from(proofs).where(eq(proofs.id, approved.id))).toMatchObject([
      { status: "approved" },
    ]);
    const ledger = await db
      .select()
      .from(pointsLedger)
      .where(eq(pointsLedger.proofId, approved.id));
    expect(ledger).toHaveLength(2);
    expect(ledger.find((entry) => entry.id === credit.id)).toBeDefined();
    expect(ledger.find((entry) => entry.reversalOf === credit.id)).toMatchObject({
      points: -9,
      awardedAt,
      createdAt: removalTime,
    });
  });

  it("removes an empty task and audits zero-point credits without changing the total", async () => {
    const { admin, alice, first, second } = await setup();
    await taskService.removeTask(admin, first.id);
    const proof = firstRow(
      await db
        .insert(proofs)
        .values({
          taskId: second.id,
          userId: alice.id,
          policy: second.policy,
          status: "approved",
        })
        .returning(),
    );
    await db.insert(pointsLedger).values({
      userId: alice.id,
      proofId: proof.id,
      points: 0,
    });

    await taskService.removeTask(admin, second.id);

    const zeroPointLedger = await db
      .select()
      .from(pointsLedger)
      .where(eq(pointsLedger.proofId, proof.id));
    expect(zeroPointLedger).toHaveLength(2);
    expect(zeroPointLedger.find((entry) => entry.reversalOf !== null)?.points).toBe(0);
    expect(await tasks.findById(first.id)).toMatchObject({ removedBy: admin.id });
  });

  it("refuses edits and archive changes after removal", async () => {
    const { admin, source, destination, first } = await setup();
    await taskService.removeTask(admin, first.id);
    await expect(
      taskService.updateTask(admin, first.id, taskInput(source.id, "Changed")),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(taskService.moveTasks(admin, [first.id], destination.id)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await expect(taskService.archiveTask(admin, first.id, true)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await expect(taskService.archiveTask(admin, first.id, false)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

describe("bulk task management", () => {
  it("moves every task and treats moving to the same category as a no-op", async () => {
    const { admin, source, destination, first, second } = await setup();

    const moved = await taskService.moveTasks(admin, [first.id, second.id], destination.id);
    const beforeNoOp = await tasks.findById(first.id);
    const noOpMoves = await taskService.moveTasks(admin, [first.id], destination.id);

    expect(moved).toEqual([
      {
        taskId: first.id,
        fromCategoryId: source.id,
        toCategoryId: destination.id,
      },
      {
        taskId: second.id,
        fromCategoryId: source.id,
        toCategoryId: destination.id,
      },
    ]);
    expect(noOpMoves).toEqual([]);
    expect(await tasks.findById(first.id)).toMatchObject({
      categoryId: destination.id,
      updatedAt: beforeNoOp?.updatedAt,
    });
    expect(await tasks.findById(second.id)).toMatchObject({ categoryId: destination.id });
  });

  it("undoes a bulk move to each task's original category", async () => {
    const { admin, source, destination, first, second } = await setup();
    const otherSource = await categories.create({
      name: "Other source",
      slug: "other-source",
    });
    await tasks.moveMany([second.id], otherSource.id);
    const moves = await taskService.moveTasks(admin, [first.id, second.id], destination.id);

    await taskService.undoMoveTasks(admin, moves);

    expect(await tasks.findById(first.id)).toMatchObject({ categoryId: source.id });
    expect(await tasks.findById(second.id)).toMatchObject({ categoryId: otherSource.id });
  });

  it("rejects a stale bulk-move undo atomically", async () => {
    const { admin, source, destination, first, second } = await setup();
    const moves = await taskService.moveTasks(admin, [first.id, second.id], destination.id);
    await tasks.moveMany([second.id], source.id);

    await expect(taskService.undoMoveTasks(admin, moves)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(await tasks.findById(first.id)).toMatchObject({ categoryId: destination.id });
    expect(await tasks.findById(second.id)).toMatchObject({ categoryId: source.id });
  });

  it("archives only newly archived IDs and can reactivate the returned IDs", async () => {
    const { admin, first, second } = await setup();
    await tasks.setArchived(second.id, true);

    const archivedIds = await taskService.setTasksArchived(admin, [first.id, second.id], true);
    await taskService.setTasksArchived(admin, archivedIds, false);

    expect(archivedIds).toEqual([first.id]);
    expect(await tasks.findById(first.id)).toMatchObject({ archivedAt: null });
    const reactivatedTask = await tasks.findById(second.id);
    expect(reactivatedTask?.archivedAt).toBeInstanceOf(Date);
  });

  it("rejects duplicate or empty selections at the action boundary", async () => {
    const { source, first } = await setup();

    expect(
      moveTasksSchema.safeParse({
        taskIds: [],
        categoryId: source.id,
      }).success,
    ).toBe(false);
    expect(
      moveTasksSchema.safeParse({
        taskIds: [first.id, first.id],
        categoryId: source.id,
      }).success,
    ).toBe(false);
    expect(
      setTasksArchivedSchema.safeParse({
        taskIds: ["not-a-uuid"],
        archived: true,
      }).success,
    ).toBe(false);
  });

  it("rejects undo with a conflict when the original category was deleted", async () => {
    const { admin, source, destination, first, second } = await setup();
    const moves = await taskService.moveTasks(admin, [first.id, second.id], destination.id);
    await categories.delete(source.id);

    await expect(taskService.undoMoveTasks(admin, moves)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(await tasks.findById(first.id)).toMatchObject({ categoryId: destination.id });
  });

  it("rejects missing IDs or categories without partially changing tasks", async () => {
    const { admin, source, destination, first, second } = await setup();
    const missingId = "00000000-0000-0000-0000-000000000000";

    await expect(
      taskService.moveTasks(admin, [first.id, missingId], destination.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      taskService.moveTasks(admin, [first.id, second.id], missingId),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      taskService.setTasksArchived(admin, [first.id, missingId], true),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    expect(await tasks.findById(first.id)).toMatchObject({
      categoryId: source.id,
      archivedAt: null,
    });
    expect(await tasks.findById(second.id)).toMatchObject({
      categoryId: source.id,
      archivedAt: null,
    });
  });

  it("rejects bulk task actions from non-managers", async () => {
    const { admin, alice, source, destination, first } = await setup();

    const moves = await taskService.moveTasks(admin, [first.id], destination.id);
    await expect(taskService.moveTasks(alice, [first.id], source.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(taskService.undoMoveTasks(alice, moves)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(taskService.setTasksArchived(alice, [first.id], true)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(taskService.setTasksArchived(null, [first.id], false)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(await tasks.findById(first.id)).toMatchObject({
      categoryId: destination.id,
      archivedAt: null,
    });
  });
});
