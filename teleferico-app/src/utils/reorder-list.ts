export function reorderList<T>(
  items: T[],
  fromIndex: number,
  toIndex: number,
) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  if (typeof movedItem === "undefined") return items;

  nextItems.splice(toIndex, 0, movedItem);

  return nextItems;
}

export function withSequentialSortOrder<T extends { sortOrder: number }>(
  items: T[],
) {
  return items.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));
}
