export function first<Item>(items: ReadonlyArray<Item>): Item {
  const [item] = items;
  if (item === undefined) {
    throw new Error("Expected at least one item, got none.");
  }

  return item;
}

export function firstTwo<Item>(items: ReadonlyArray<Item>): [Item, Item] {
  const [a, b] = items;
  if (a === undefined || b === undefined) {
    throw new Error(`Expected at least two items, got ${items.length}.`);
  }

  return [a, b];
}
