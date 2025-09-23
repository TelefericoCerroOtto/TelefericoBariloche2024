"use client";

import { useCallback, useState } from "react";

export function useNewsFilters() {
  const [filterValue, setFilterValue] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [highlightedOnly, setHighlightedOnly] = useState(false);

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

  const onDateChange = useCallback((value: string) => {
    setDateValue(value);
  }, []);

  const onDateClear = useCallback(() => {
    setDateValue("");
  }, []);

  const onHighlightedChange = useCallback((value: boolean) => {
    setHighlightedOnly(value);
  }, []);

  return {
    filterValue,
    onSearchChange,
    onSearchClear,
    dateValue,
    onDateChange,
    onDateClear,
    highlightedOnly,
    onHighlightedChange,
  };
}
