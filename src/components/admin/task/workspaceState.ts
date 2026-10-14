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
  const query = search.trim().toLocaleLowerCase();
  const groups = categories.map((category) => ({
    category,
    tasks: tasks.filter((task) => {
      if (task.categoryId !== category.id || (!showArchived && task.archived)) {
        return false;
      }

      return (
        query.length === 0 ||
        task.title.toLocaleLowerCase().includes(query) ||
        task.description.toLocaleLowerCase().includes(query)
      );
    }),
  }));

  return query.length === 0
    ? groups
    : groups.filter(({ tasks: visibleTasks }) => visibleTasks.length > 0);
}
