import { describe, expect, it } from "vitest";
import type { CategoryView, TaskView } from "~/components/admin/task/model";
import { groupWorkspaceTasks } from "~/components/admin/task/workspaceState";

const categories: Array<CategoryView> = [
  {
    id: "food",
    name: "Food",
    slug: "food",
  },
  {
    id: "home",
    name: "Home",
    slug: "home",
  },
  {
    id: "empty",
    name: "Empty",
    slug: "empty",
  },
];

const tasks: Array<TaskView> = [
  {
    id: "task-1",
    title: "Bake bread",
    description: "Use the rye flour",
    categoryId: "food",
    categoryName: "Food",
    points: 5,
    policy: "one_per_user",
    cooldownSeconds: null,
    photoRequired: false,
    photoInstructions: null,
    archived: false,
  },
  {
    id: "task-2",
    title: "Clean room",
    description: "Put away toys",
    categoryId: "home",
    categoryName: "Home",
    points: 3,
    policy: "single_winner",
    cooldownSeconds: null,
    photoRequired: false,
    photoInstructions: null,
    archived: true,
  },
];

describe("task workspace grouping", () => {
  it("shows active tasks and empty categories by default", () => {
    const groups = groupWorkspaceTasks(tasks, categories, "", false);

    expect(
      groups.map(({ category, tasks: groupTasks }) => [category.name, groupTasks.length]),
    ).toEqual([
      ["Food", 1],
      ["Home", 0],
      ["Empty", 0],
    ]);
  });

  it("searches task titles and descriptions and omits non-matching categories", () => {
    const groups = groupWorkspaceTasks(tasks, categories, "RYE", false);

    expect(groups.map(({ category }) => category.name)).toEqual(["Food"]);
    expect(groups[0]?.tasks.map(({ id }) => id)).toEqual(["task-1"]);
  });

  it("shows archived tasks only when archive visibility is enabled", () => {
    const groups = groupWorkspaceTasks(tasks, categories, "", true);

    expect(groups[1]?.tasks.map(({ id }) => id)).toEqual(["task-2"]);
  });
});
