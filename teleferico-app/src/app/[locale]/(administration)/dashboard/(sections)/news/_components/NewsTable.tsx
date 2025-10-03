"use client";

import { TableActionsButtons, TableContainer } from "@/components";
import { useProxy } from "@/hooks";
import type { GetNewsResponse } from "@/types";
import { ADMIN_ROUTES, STRAPI_ENDPOINTS, tableStyles } from "@/utils";
import {
  Pagination,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Filters from "./Filters";
import { useNewsFilters } from "./use-news-filters";

const columns: { key: ColumnKeys; label: string }[] = [
  { key: "title", label: "Título" },
  { key: "date", label: "Fecha" },
  { key: "highglighted", label: "Destacada" },
  { key: "updatedAt", label: "Actualizado" },
  { key: "actions", label: "Acciones" },
];

type ColumnKeys = "title" | "date" | "highglighted" | "updatedAt" | "actions";
const PAGE_SIZE = 10;

export default function NewsTable() {
  const [page, setPage] = useState(1);
  const {
    filterValue,
    onSearchChange,
    onSearchClear,
    dateValue,
    onDateChange,
    onDateClear,
    highlightedOnly,
    onHighlightedChange,
  } = useNewsFilters();

  useEffect(() => {
    setPage(1);
  }, [filterValue, dateValue, highlightedOnly]);

  const query = useMemo(() => {
    const filters: Record<string, unknown> = {};

    if (filterValue) {
      filters.title = { $containsi: filterValue };
    }

    if (dateValue) {
      filters.date = { $eq: dateValue };
    }

    if (highlightedOnly) {
      filters.highlighted = { $eq: true };
    }

    return {
      fields: ["title", "highlighted", "date", "updatedAt", "documentId"],
      populate: {
        cover: {
          populate: "image",
        },
      },
      sort: ["date:desc"],
      pagination: {
        page,
        pageSize: PAGE_SIZE,
      },
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      locale: "es-AR",
    };
  }, [dateValue, filterValue, highlightedOnly, page]);

  const { data, isError, isLoading, key } = useProxy<GetNewsResponse>(
    STRAPI_ENDPOINTS.NEWS,
    query,
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    if (isError) {
      console.error("Hubo un error al cargar las noticias", isError);
    }
  }, [isError]);

  const renderCell = useCallback(
    (item: GetNewsResponse["data"][number], columnKey: ColumnKeys) => {
      switch (columnKey) {
        case "title":
          return <span>{item.title}</span>;
        case "date":
          return (
            <span>
              {new Date(item.date).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          );
        case "highglighted":
          return (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                item.highlighted
                  ? "bg-green-100 text-green-700"
                  : "bg-default-200 text-default-600"
              }`}
            >
              {item.highlighted ? "Sí" : "No"}
            </span>
          );
        case "updatedAt":
          return (
            <span>
              {new Date(item.updatedAt).toLocaleString("es-AR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          );
        case "actions":
          return (
            <TableActionsButtons
              editPath={ADMIN_ROUTES.EDIT_NEWS}
              erasePath={STRAPI_ENDPOINTS.NEWS}
              item={item}
              eraseModalTitle="Eliminar noticia"
              swrMutateKey={key}
            />
          );
        default:
          return null;
      }
    },
    [key],
  );

  const totalPages = data?.meta.pagination.pageCount ?? 1;

  return (
    <>
      <Filters
        filterValue={filterValue}
        onSearchChange={onSearchChange}
        onSearchClear={onSearchClear}
        dateValue={dateValue}
        onDateChange={onDateChange}
        onDateClear={onDateClear}
        highlightedOnly={highlightedOnly}
        onHighlightedChange={onHighlightedChange}
      />
      <TableContainer>
        <Table
          {...tableStyles}
          bottomContent={
            <div className="flex w-full justify-center">
              <Pagination
                isDisabled={isLoading}
                showControls
                page={page}
                total={totalPages}
                onChange={setPage}
              />
            </div>
          }
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                key={column.key}
                className={`${column.key === "actions" ? "text-center" : ""} text-black`}
              >
                {column.label}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            emptyContent={"No hay noticias para mostrar"}
            items={data?.data ?? []}
            isLoading={isLoading}
            loadingContent={<Spinner label="Cargando noticias" />}
          >
            {(item) => (
              <TableRow key={item.id}>
                {(columnKey) => (
                  <TableCell>
                    {renderCell(item, columnKey as ColumnKeys)}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
