export function matchesTaskSearch(
  task: { readonly title: string; readonly description: string },
  search: string,
): boolean {
  const query = search.trim().toLocaleLowerCase();

  return (
    query.length === 0 ||
    task.title.toLocaleLowerCase().includes(query) ||
    task.description.toLocaleLowerCase().includes(query)
  );
}
