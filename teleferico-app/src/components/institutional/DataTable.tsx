"use client";

import { TableContainer } from "@/components";
import { useLocale } from "@/hooks";
import {
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import Link from "next/link";
import { ReactNode, type Key } from "react";

interface Props<T> {
  title: string;
  desc: string;
  link?: { href: string; label: string };
  isLoading?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isError?: any;
  // eslint-disable-next-line no-unused-vars
  renderCell: (entry: T, columnKey: Key) => ReactNode;
  items: Array<T>;
  columns: Array<{ key: string; label: string }>;
}

const dictionaries = {
  loaderIntl: {
    "es-AR": "Cargando...",
    en: "Loading...",
    pt: "Carregando...",
  },
  emptyContent: {
    "es-AR": "No hay datos disponibles en esta tabla.",
    en: "No data available in this table.",
    pt: "Não há dados disponíveis nesta tabela.",
  },
};

export default function DataTable<T extends { id: number | string }>(
  props: Props<T>,
) {
  const { title, desc, link, items, columns, renderCell, isLoading, isError } =
    props;

  // TODO: Mejorar respuesta de interfaz en caso de que no carguen los datos
  if (isError)
    console.log(
      "Hubo un error al cargar los datos de la tabla: ",
      title,
      "\n",
      isError,
    );

  const { locale } = useLocale();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-[850px] flex-col gap-2">
        <h4 className="text-2xl font-bold">{title}</h4>
        <p>{desc}</p>
        {link ? (
          <div>
            <Link
              href={link.href}
              className="font-bold capitalize text-custom-red hover:underline"
            >
              {link.label}
            </Link>
          </div>
        ) : null}
      </div>
      <TableContainer>
        <Table
          className="min-w-[650px]"
          classNames={{
            wrapper: "p-0 border",
            th: ["rounded-none", "border-b", "border-divider", "text-lg"],
            tr: ["my-2"],
            td: [
              "text-lg",
              // group-data-[selecciona por grupo de filas dentro de la tabla: primera, del medio y ultima]
              // /tr selecciona la fila

              // border
              "group-data-[first=true]/tr:border-b",
              "group-data-[middle=true]/tr:border-b",

              // padding
              "group-data-[first=true]/tr:py-4",
              "group-data-[middle=true]/tr:py-4",
              "group-data-[last=true]/tr:py-4",
              "group-data-[first=true]/tr:px-3",
              "group-data-[middle=true]/tr:px-3",
              "group-data-[last=true]/tr:px-3",
            ],
          }}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn key={column.key} className="text-black">
                {column.label}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            items={items}
            isLoading={isLoading}
            loadingContent={<Spinner label={dictionaries.loaderIntl[locale]} />}
            emptyContent={dictionaries.emptyContent[locale]}
          >
            {(entry) => (
              <TableRow key={entry.id}>
                {(columnKey) => (
                  <TableCell>{renderCell(entry, columnKey)}</TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
