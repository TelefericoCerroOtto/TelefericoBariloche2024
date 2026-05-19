"use client";

import { TableContainer } from "@/components";
import { useAppAlert, useProxy } from "@/hooks";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { tableStyles } from "@/lib/constants/styles.const";
import type {
  Genders,
  GetPostulationsResponse,
  PostulationStatus,
  Sector,
} from "@/types";
import {
  Pagination,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  type Selection,
} from "@heroui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import BulkPostulationActions from "./BulkPostulationsActions";
import { handleBulkPostulationStatus } from "./bulkPostulationStatus";
import { columns, PAGE_SIZE, type ColumnKeys } from "./data";
import Filters, { type Option } from "./Filters";
import { usePostulationFilters } from "./hooks/use-filters";
import { useQuery } from "./hooks/use-query";
import { renderPostulationCell } from "./renderPostulationCell";

interface Props {
  sectors: Sector[];
  userId: number;
}

const columnWidths: Record<ColumnKeys, string> = {
  date: "w-36 whitespace-nowrap ps-10",
  name: "w-56",
  email: "w-[24rem]",
  age: "w-20 whitespace-nowrap",
  gender: "w-28 whitespace-nowrap",
  postulation_status: "w-44 whitespace-nowrap",
  sector: "w-40",
  note: "w-[22rem]",
  campNo: "w-36 whitespace-nowrap",
  actions: "w-[30rem] whitespace-nowrap",
};

export default function PostulationsTable({ sectors, userId }: Props) {
  const { showAlert } = useAppAlert();
  const [selectedRows, setSelectedRows] = useState<Selection>(new Set([]));
  const [page, setPage] = useState(1);
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const { mutate } = useSWRConfig();

  // Opciones para selects
  const sectorOptions: Option[] = useMemo(
    () =>
      sectors.map((sector) => ({
        key: sector.documentId, // usamos documentId para filtrar en Strapi
        label: `${sector.sector_names?.[0]?.name ?? sector.key}${
          sector.isActive ? "" : " (inactivo)"
        }`,
      })),
    [sectors],
  );

  const genderOptions: Option<Genders>[] = useMemo(
    () => [
      { key: "male", label: "Masculino" },
      { key: "female", label: "Femenino" },
      { key: "other", label: "Otro" },
    ],
    [],
  );

  const {
    search,
    campNo,
    minAge,
    maxAge,
    selectedGenders,
    selectedSectors,
    favoritesOnly,
    timePreset,
    selectedStatuses,
    debouncedSearch,
    debouncedCampNo,
    ...handlers
  } = usePostulationFilters();

  // Resetear página cuando cambia algún filtro "real"
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    debouncedCampNo,
    minAge,
    maxAge,
    selectedGenders,
    selectedSectors,
    favoritesOnly,
    selectedStatuses,
    timePreset,
  ]);

  const query = useQuery({
    page,
    pageSize: PAGE_SIZE,
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
  });

  const { data, isError, isLoading, key } = useProxy<GetPostulationsResponse>(
    STRAPI_ENDPOINTS.POSTULATIONS,
    query,
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    if (isError) {
      console.log("get postulations error: ", isError);
      showAlert({
        title: "Error",
        message: "Hubo un error al cargar las postulaciones",
        variant: "danger",
      });
    }
  }, [isError, showAlert]);

  const postulations = useMemo(() => data?.data ?? [], [data]);
  const totalPages = data?.meta.pagination.pageCount ?? 1;

  const handleFavoriteSync = useCallback(
    async (_postulationId?: string, _nextFavorite?: boolean) => {
      // Opcional: podrías hacer un optimistic update acá

      // Revalidar la tabla completa después de cambiar el favorito
      await mutate(key);
    },
    [mutate, key],
  );

  const renderCell = useCallback(
    (item: GetPostulationsResponse["data"][number], columnKey: ColumnKeys) =>
      renderPostulationCell({
        item,
        columnKey,
        genderOptions,
        userId,
        handleFavoriteSync,
      }),
    [genderOptions, handleFavoriteSync, userId],
  );

  const handleApplyStatus = useCallback(
    (postulationStatus: PostulationStatus) =>
      handleBulkPostulationStatus({
        postulationStatus,
        postulations,
        selectedRows,
        key,
        mutate,
        setIsBulkApplying,
        setSelectedRows,
        showAlert,
      }),
    [
      postulations,
      selectedRows,
      key,
      mutate,
      setIsBulkApplying,
      setSelectedRows,
      showAlert,
    ],
  );

  // Evitar hydration error con Table de HeroUI
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  if (!isClient) {
    return null;
  }

  return (
    <>
      <Filters
        searchValue={search}
        campNoValue={campNo}
        minAge={minAge}
        maxAge={maxAge}
        genderOptions={genderOptions}
        selectedGenders={selectedGenders}
        sectorOptions={sectorOptions}
        selectedSectors={selectedSectors}
        favoritesOnly={favoritesOnly}
        selectedStatuses={selectedStatuses}
        timePreset={timePreset}
        {...handlers}
      />
      <BulkPostulationActions
        selectedRows={selectedRows}
        isApplying={isBulkApplying}
        disabled={isLoading}
        onApplyStatus={handleApplyStatus}
      />
      <div className="space-y-4">
        <TableContainer>
          <Table
            {...tableStyles}
            className="text-base"
            classNames={{
              ...tableStyles.classNames,
              table: "bg-white table-fixed min-w-[94rem]",
              th: "bg-white font-bold text-black",
              td: "align-middle",
            }}
            selectionMode="multiple"
            selectedKeys={selectedRows}
            onSelectionChange={setSelectedRows}
            selectionBehavior="toggle"
          >
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  className={`${columnWidths[column.key]} ${
                    column.key === "actions" ? "text-center" : ""
                  } text-lg font-semibold text-default-700`}
                >
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              className="text-base"
              emptyContent={"No hay postulaciones para mostrar"}
              items={postulations}
              isLoading={isLoading}
              loadingContent={<Spinner label="Cargando postulaciones" />}
            >
              {(item) => (
                <TableRow key={item.documentId}>
                  {(columnKey) => (
                    <TableCell
                      className={`text-base ${
                        columnKey === "date" ? "ps-10" : ""
                      } ${columnKey === "actions" ? "overflow-visible" : ""}`}
                    >
                      {renderCell(item, columnKey as ColumnKeys)}
                    </TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <div className="flex w-full justify-center pb-2">
          <Pagination
             className="text-base"
             disableCursorAnimation
             isDisabled={isLoading}
             showControls
             page={page}
             total={totalPages}
             onChange={setPage}
          />
        </div>
      </div>
    </>
  );
}
