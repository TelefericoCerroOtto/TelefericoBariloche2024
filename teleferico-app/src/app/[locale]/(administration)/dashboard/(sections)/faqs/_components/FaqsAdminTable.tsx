"use client";

import { TableActionsButtons, TableContainer } from "@/components";
import { useAppAlert, useProxy } from "@/hooks";
import { i18n } from "@/i18n";
import { ADMIN_ROUTES, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { tableStyles } from "@/lib/constants/styles.const";
import { GetFaqsResponse } from "@/types";
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
import { useCallback, useMemo, useState } from "react";
import FaqFeaturedToggle from "./FaqFeaturedToggle";

type ColumnKeys = "question" | "featured" | "actions";

const columns: { key: ColumnKeys; label: string }[] = [
  { key: "question", label: "Pregunta" },
  { key: "featured", label: "Destacada" },
  { key: "actions", label: "Acciones" },
];
const PAGE_SIZE = 10;

export default function FaqsAdminTable() {
  const [page, setPage] = useState(1);
  const { showAlert } = useAppAlert();

  const query = useMemo(() => {
    return {
      locale: i18n.defaultLocale,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
      },
    };
  }, [page]);

  const { data, isError, isLoading, key } = useProxy<GetFaqsResponse>(
    STRAPI_ENDPOINTS.FAQS,
    query,
    {
      revalidateOnFocus: false,
    },
  );

  if (isError) {
    console.log("get faqs error: ", isError);
    showAlert({
      title: "Error",
      message: "Hubo un error al cargar las preguntas frecuentes.",
      variant: "danger",
    });
  }

  const renderCell = useCallback(
    (item: GetFaqsResponse["data"][number], columnKey: ColumnKeys) => {
      switch (columnKey) {
        case "question":
          return <span>{item.question}</span>;

        case "featured":
          return <FaqFeaturedToggle faq={item} />;

        case "actions":
          return (
            <TableActionsButtons
              editPath={ADMIN_ROUTES.EDIT_FAQS}
              erasePath={STRAPI_ENDPOINTS.FAQS}
              item={item}
              eraseModalTitle="Eliminar pregunta frecuente"
              swrMutateKey={key}
            />
          );

        default:
          break;
      }
    },
    [key],
  );

  const totalPages = data?.meta.pagination.pageCount ?? 1;

  return (
    <TableContainer>
      <Table
        {...tableStyles}
        className="text-base"
        bottomContent={
          <div className="flex w-full justify-center">
            <Pagination
              className="text-base"
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
              className={`${
                column.key === "actions" ? "text-center" : ""
              } text-lg font-semibold text-black`}
            >
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          className="text-base"
          emptyContent="No se encontraron preguntas frecuentes."
          items={data?.data ?? []}
          isLoading={isLoading}
          loadingContent={<Spinner label="Cargando preguntas frecuentes" />}
        >
          {(item) => (
            <TableRow key={item.id}>
              {(columnKey) => (
                <TableCell className="text-base">
                  {renderCell(item, columnKey as ColumnKeys)}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
