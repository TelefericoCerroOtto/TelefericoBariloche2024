"use client";

import { TableContainer } from "@/components";
import { useLocale } from "@/hooks";
import { cn } from "@/utils";
import {
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { CableCar, CircleAlert } from "lucide-react";
import { ReactNode, type Key, useEffect } from "react";

type ColumnAlign = "start" | "center" | "end";

type Column = {
  key: string;
  label: string;
  align?: ColumnAlign;
};

interface Props<T> {
  ariaLabel?: string;
  isLoading?: boolean;
  isError?: unknown;
  // eslint-disable-next-line no-unused-vars
  renderCell: (entry: T, columnKey: Key) => ReactNode;
  items: Array<T>;
  columns: Array<Column>;
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
  emptyTitle: {
    "es-AR": "Todavía no hay información disponible",
    en: "There is no information available yet",
    pt: "Ainda não há informações disponíveis",
  },
  errorTitle: {
    "es-AR": "No pudimos cargar la tabla",
    en: "We could not load the table",
    pt: "Não foi possível carregar a tabela",
  },
  errorDescription: {
    "es-AR": "Hubo un inconveniente al obtener los datos. Intentá nuevamente en unos minutos.",
    en: "There was an issue fetching the data. Please try again in a few minutes.",
    pt: "Houve um problema ao buscar os dados. Tente novamente em alguns minutos.",
  },
  loadingDescription: {
    "es-AR": "Estamos preparando la información más reciente para esta sección.",
    en: "We are preparing the latest information for this section.",
    pt: "Estamos preparando as informações mais recentes para esta seção.",
  },
  defaultAriaLabel: {
    "es-AR": "Tabla de información",
    en: "Information table",
    pt: "Tabela de informações",
  },
};

const alignmentClasses: Record<ColumnAlign, string> = {
  start: "justify-start text-left",
  center: "justify-center text-center",
  end: "justify-end text-right",
};

function TableState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/15 bg-red-500/5 text-red-700 shadow-sm shadow-red-900/5">
        {icon}
      </div>

      <div className="mt-5 max-w-md space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">
          Teleférico Bariloche
        </p>
        <h3 className="text-lg font-semibold text-foreground sm:text-xl">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-foreground/60 sm:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function DataTable<T extends { id: number | string }>(
  props: Props<T>,
) {
  const { items, columns, renderCell, isLoading, isError, ariaLabel } = props;

  useEffect(() => {
    if (isError)
      console.error("Hubo un error al cargar los datos de la tabla:", isError);
  }, [isError]);

  const { locale } = useLocale();

  return (
    <TableContainer>
      <Table
        aria-label={ariaLabel ?? dictionaries.defaultAriaLabel[locale]}
        className="min-w-[720px] border-separate border-spacing-0"
        isStriped
        radius="none"
        selectionMode="none"
        shadow="none"
        classNames={{
          base: "overflow-visible",
          wrapper:
            "overflow-hidden rounded-[1.75rem] border border-border/70 bg-white/90 p-0 shadow-xl shadow-black/5 ring-1 ring-red-500/10 backdrop-blur-sm",
          thead:
            "[&>tr]:bg-gradient-to-r [&>tr]:from-red-600/[0.08] [&>tr]:via-white [&>tr]:to-red-600/[0.03] [&>tr]:shadow-[inset_0_-1px_0_rgba(127,29,29,0.08)]",
          th: [
            "rounded-none border-b border-red-500/10 bg-transparent px-4 py-5 first:pl-6 last:pr-6",
            "text-sm font-semibold uppercase tracking-[0.24em] text-foreground/65",
          ],
          tr: [
            "group/tr outline-none transition-colors duration-200",
            "data-[hover=true]:bg-red-600/[0.04]",
            "data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-primary/35 data-[focus-visible=true]:ring-inset",
          ],
          tbody: "[&>[data-last=true]>td]:border-b-0",
          td: [
            "border-b border-border/60 px-4 py-5 align-middle first:pl-6 last:pr-6",
            "text-lg text-foreground/80 transition-colors",
            "group-data-[odd=true]/tr:bg-default-50/55",
            "group-data-[hover=true]/tr:bg-red-600/[0.04]",
          ],
          emptyWrapper: "px-0 py-0",
          loadingWrapper: "px-0 py-0",
        }}
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.key}
              className={cn(
                "text-black",
                column.align === "center" && "text-center",
                column.align === "end" && "text-right",
              )}
            >
                <span
                  className={cn(
                    "inline-flex w-fit items-center rounded-full border border-red-500/10 bg-white/85 px-3.5 py-1.5 shadow-sm shadow-black/5",
                    column.align === "center" && "mx-auto",
                    column.align === "end" && "ml-auto",
                  )}
              >
                {column.label}
              </span>
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={items}
          isLoading={isLoading}
          loadingContent={
            <TableState
              icon={<Spinner color="danger" size="lg" />}
              title={dictionaries.loaderIntl[locale]}
              description={dictionaries.loadingDescription[locale]}
            />
          }
          emptyContent={
            isError ? (
              <TableState
                icon={<CircleAlert className="h-6 w-6" />}
                title={dictionaries.errorTitle[locale]}
                description={dictionaries.errorDescription[locale]}
              />
            ) : (
              <TableState
                icon={<CableCar className="h-6 w-6" />}
                title={dictionaries.emptyTitle[locale]}
                description={dictionaries.emptyContent[locale]}
              />
            )
          }
        >
          {(entry) => (
            <TableRow key={entry.id}>
              {(columnKey) => {
                const column = columns.find(
                  ({ key }) => key === String(columnKey),
                );
                const align = column?.align ?? "start";

                return (
                  <TableCell>
                    <div className={cn("flex w-full", alignmentClasses[align])}>
                      {renderCell(entry, columnKey)}
                    </div>
                  </TableCell>
                );
              }}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
