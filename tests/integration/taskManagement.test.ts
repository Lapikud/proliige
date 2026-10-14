import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { moveTasksSchema, setTasksArchivedSchema } from "~/actions/task/schema";
import { createTaskService } from "~/core/services/task";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createTaskRepository } from "~/infra/db/task/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { connect, seedUsers, truncateAll } from "./helpers";

const { client, db } = connect();
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const users = createUserRepository(db);
const taskService = createTaskService({ tasks });

const taskInput = (categoryId: string, title: string) => ({
  title,
  description: "",
  categoryId,
  points: 5,
  policy: "one_per_user" as const,
  cooldownSeconds: 0,
  photoRequired: false,
  photoInstructions: "",
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
  });
  const second = await tasks.create({
    ...taskInput(source.id, "Second"),
    cooldownSeconds: null,
    photoInstructions: null,
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
