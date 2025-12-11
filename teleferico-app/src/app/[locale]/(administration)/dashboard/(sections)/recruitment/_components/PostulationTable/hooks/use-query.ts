import { i18n } from "@/i18n";
import { type Selection } from "@heroui/react";
import { useMemo } from "react";
import type { TimePreset } from "./use-filters";

interface UsePostulationsQueryParams {
  page: number;
  pageSize: number;
  userId: string;

  debouncedSearch: string;
  debouncedCampNo: string;
  minAge: number;
  maxAge: number;
  selectedGenders: Selection;
  selectedSectors: Selection;
  favoritesOnly: boolean;
  selectedStatuses: Selection;
  timePreset: TimePreset;
}

export const useQuery = (params: UsePostulationsQueryParams) => {
  const {
    page,
    pageSize,
    userId,
    debouncedSearch,
    debouncedCampNo,
    minAge,
    maxAge,
    selectedGenders,
    selectedSectors,
    favoritesOnly,
    selectedStatuses,
    timePreset,
  } = params;

  return useMemo(() => {
    const filters: Record<string, unknown> = {};

    if (debouncedSearch) {
      filters.name = { $containsi: debouncedSearch };
    }

    if (debouncedCampNo) {
      const n = Number(debouncedCampNo);
      if (!Number.isNaN(n) && n > 0) {
        filters.campNo = { $eq: n };
      }
    }

    if (minAge != null || maxAge != null) {
      filters.age = {} as { $gte?: number; $lte?: number };

      if (minAge != null) (filters.age as { $gte?: number }).$gte = minAge;
      if (maxAge != null) (filters.age as { $lte?: number }).$lte = maxAge;
    }

    if (
      selectedGenders !== "all" &&
      (selectedGenders as Set<string>).size > 0
    ) {
      const genders = Array.from(selectedGenders as Set<string>);
      filters.gender = { $in: genders };
    }

    if (
      selectedSectors !== "all" &&
      (selectedSectors as Set<string>).size > 0
    ) {
      const sectorIds = Array.from(selectedSectors as Set<string>);
      filters.sector = {
        documentId: { $in: sectorIds },
      };
    }

    if (favoritesOnly) {
      // 👇 Modo "Solo favoritas": ignorar estado + tiempo
      filters.faved_by = { $eq: userId };
    } else {
      // 👇 Filtro de estado (multi)
      if (
        selectedStatuses !== "all" &&
        (selectedStatuses as Set<string>).size > 0
      ) {
        const statuses = Array.from(selectedStatuses as Set<string>);
        filters.postulation_status = { $in: statuses };
      }

      // 👇 Filtro de tiempo (presets)
      if (timePreset !== "all") {
        const from = new Date();

        if (timePreset === "3m") {
          from.setMonth(from.getMonth() - 3);
        } else if (timePreset === "6m") {
          from.setMonth(from.getMonth() - 6);
        } else if (timePreset === "12m") {
          from.setMonth(from.getMonth() - 12);
        }

        filters.createdAt = {
          $gte: from.toISOString(),
        };
      }
    }

    return {
      sort: ["createdAt:desc"],
      pagination: {
        page,
        pageSize,
      },
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      populate: {
        sector: {
          populate: {
            sector_names: {
              filters: {
                locale: {
                  $eq: i18n.defaultLocale,
                },
              },
            },
          },
        },
        faved_by: true,
        resume: true,
      },
    };
  }, [
    page,
    pageSize,
    debouncedSearch,
    debouncedCampNo,
    minAge,
    maxAge,
    selectedGenders,
    selectedSectors,
    favoritesOnly,
    userId,
    selectedStatuses,
    timePreset,
  ]);
};
