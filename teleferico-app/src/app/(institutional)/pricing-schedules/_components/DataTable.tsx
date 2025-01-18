import { TableContainer } from "@/components";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import Link from "next/link";
import { type Key } from "react";

interface Props<T> {
  title: string;
  desc: string;
  link?: { href: string; label: string };
  // eslint-disable-next-line no-unused-vars
  renderCell: (entry: T, columnKey: Key) => JSX.Element;
  items: Array<T>;
  columns: Array<{ key: Extract<keyof T, string | number>; label: string }>;
}

export default function DataTable<T extends { id: number | string }>(
  props: Props<T>,
) {
  const { title, desc, link, items, columns, renderCell } = props;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-[850px] flex-col gap-2">
        <h4 className="text-2xl font-bold">{title}</h4>
        <p>{desc}</p>
        {link ? (
          <Link
            href={link.href}
            className="font-bold capitalize text-custom-red"
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      <TableContainer>
        <Table
          className="min-w-[650px]"
          classNames={{
            wrapper: "p-0 border",
            th: ["rounded-none", "border-b", "border-divider"],
            tr: ["my-2"],
            td: [
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
          <TableBody items={items}>
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
