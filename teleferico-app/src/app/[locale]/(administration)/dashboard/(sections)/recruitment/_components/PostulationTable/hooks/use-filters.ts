import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { type Selection } from "@heroui/react";
import { useCallback, useState } from "react";

export type TimePreset = "3m" | "6m" | "12m" | "all";

export function usePostulationFilters() {
  const [search, setSearch] = useState("");
  const [campNo, setCampNo] = useState("");
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(70);
  const [selectedGenders, setSelectedGenders] = useState<Selection>(
    new Set([]),
  );
  const [selectedSectors, setSelectedSectors] = useState<Selection>(
    new Set([]),
  );
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [timePreset, setTimePreset] = useState<TimePreset>("6m"); // vista por defecto: últimos 6 meses
  const [selectedStatuses, setSelectedStatuses] = useState<Selection>(
    // En produccion el valor por defecto es "unreviewed"
    new Set(["unreviewed"]),
  );

  // Solo vamos a debounc-ear lo que puede disparar muchas requests
  const debouncedSearch = useDebouncedValue(search, 400);
  const debouncedCampNo = useDebouncedValue(campNo, 400);

  const onSearchChange = useCallback((value?: string) => {
    setSearch(value ?? "");
  }, []);

  const onSearchClear = useCallback(() => {
    setSearch("");
  }, []);

  const onCampNoChange = useCallback((value?: string) => {
    setCampNo(value ?? "");
  }, []);

  const onCampNoClear = useCallback(() => {
    setCampNo("");
  }, []);

  const onAgeRangeChange = useCallback((range: [number, number]) => {
    setMinAge(range[0]);
    setMaxAge(range[1]);
  }, []);

  const onGendersChange = useCallback((keys: Selection) => {
    setSelectedGenders(keys);
  }, []);

  const onSectorsChange = useCallback((keys: Selection) => {
    setSelectedSectors(keys);
  }, []);

  const onFavoritesChange = useCallback((value: boolean) => {
    setFavoritesOnly(value);
  }, []);

  const onTimePresetChange = useCallback((preset: TimePreset) => {
    setTimePreset(preset);
  }, []);

  const onStatusesChange = useCallback((status: Selection) => {
    setSelectedStatuses(status);
  }, []);

  return {
    // valores crudos (para UI)
    search,
    campNo,
    minAge,
    maxAge,
    selectedGenders,
    selectedSectors,
    favoritesOnly,
    timePreset,
    selectedStatuses,

    // valores debounced (para query)
    debouncedSearch,
    debouncedCampNo,

    // handlers
    onSearchChange,
    onSearchClear,
    onCampNoChange,
    onCampNoClear,
    onAgeRangeChange,
    onGendersChange,
    onSectorsChange,
    onFavoritesChange,
    onTimePresetChange,
    onStatusesChange,
  };
}
