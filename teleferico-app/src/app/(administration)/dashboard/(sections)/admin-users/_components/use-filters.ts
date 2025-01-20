import { useCallback, useMemo, useState } from "react";

export function useFilters<T extends { name: string }>(items: Array<T>) {
  const [filterValue, setFilterValue] = useState("");
  const hasSearchFilter = Boolean(filterValue);

  const filteredItems = useMemo(() => {
    let tmpFilteredItems = [...items];

    if (hasSearchFilter) {
      tmpFilteredItems = tmpFilteredItems.filter((item) =>
        item.name.toLowerCase().includes(filterValue.toLowerCase()),
      );
    }

    return tmpFilteredItems;
  }, [filterValue, hasSearchFilter, items]);

  const onSearchChange = useCallback((value?: string) => {
    if (value) {
      setFilterValue(value);
    } else {
      setFilterValue("");
    }
  }, []);

  const onSearchClear = useCallback(() => {
    setFilterValue("");
  }, []);

  return { filterValue, filteredItems, onSearchChange, onSearchClear };
}
