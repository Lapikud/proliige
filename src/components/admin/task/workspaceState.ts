import { matchesTaskSearch } from "../../task/search";
import type { CategoryView, TaskView } from "./model";

export interface TaskGroup {
  category: CategoryView;
  tasks: Array<TaskView>;
}

export function groupWorkspaceTasks(
  tasks: Array<TaskView>,
  categories: Array<CategoryView>,
  search: string,
  showArchived: boolean,
): Array<TaskGroup> {
  const groups = categories.map((category) => ({
    category,
    tasks: tasks.filter((task) => {
      if (task.categoryId !== category.id || (!showArchived && task.archived && !task.removed)) {
        return false;
      }

      return matchesTaskSearch(task, search);
    }),
  }));

  return search.trim() === ""
    ? groups
    : groups.filter(({ tasks: visibleTasks }) => visibleTasks.length > 0);
}
