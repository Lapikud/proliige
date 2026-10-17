import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTaskService } from "~/core/services/task";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createTaskRepository } from "~/infra/db/task/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { connect, seedUsers, truncateAll } from "./helpers";

const { client, db } = connect();
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const users = createUserRepository(db);
const taskService = createTaskService({
  tasks,
  clock: { now: () => new Date("2026-10-17T12:00:00Z") },
});

afterAll(async () => client.end());
beforeEach(async () => truncateAll(db));

async function setup() {
  const people = await seedUsers(users);
  const member = await users.upsertFromIdentity({
    ipaUniqueId: "ipa-member",
    uid: "member",
    displayName: "Member",
    groups: ["members"],
  });
  const category = await categories.create({
    name: "Lapikud",
    slug: "lapikud",
  });
  const idea = {
    title: "Korralda lauamänguõhtu",
    description: "",
    categoryId: category.id,
    points: 50,
    policy: "one_per_user" as const,
    cooldownSeconds: 0,
    photoRequired: false,
    photoInstructions: "",
    textRequired: false,
    showOnFeed: true,
  };

  return {
    ...people,
    member,
    idea,
  };
}

describe("task suggestions", () => {
  it("keeps a member's suggestion off the task list until an admin publishes it", async () => {
    const { member, alice, admin, idea } = await setup();
    const suggested = await taskService.suggestTask(member, idea);

    expect(suggested.suggestionPending).toBe(true);
    expect(await taskService.listOpenTasks(alice)).toEqual([]);
    expect(await taskService.getTask(alice, suggested.id)).toBeNull();
    expect(await taskService.listAllTasks(admin)).toMatchObject([
      {
        task: {
          id: suggested.id,
          suggestionPending: true,
        },
        suggestedByName: "Member",
      },
    ]);

    await taskService.publishSuggestion(admin, suggested.id);
    expect(await taskService.listOpenTasks(alice)).toMatchObject([{ task: { id: suggested.id } }]);
  });

  it("deletes a declined suggestion", async () => {
    const { member, admin, idea } = await setup();
    const suggested = await taskService.suggestTask(member, idea);

    await taskService.declineSuggestion(admin, suggested.id);
    expect(await taskService.listAllTasks(admin)).toEqual([]);
    await expect(taskService.declineSuggestion(admin, suggested.id)).rejects.toThrow();
  });

  it("refuses suggestions from users without a group and stops members browsing tasks", async () => {
    const { member, outsider, idea } = await setup();

    await expect(taskService.suggestTask(outsider, idea)).rejects.toThrow();
    await expect(taskService.listOpenTasks(member)).rejects.toThrow();
  });
});
