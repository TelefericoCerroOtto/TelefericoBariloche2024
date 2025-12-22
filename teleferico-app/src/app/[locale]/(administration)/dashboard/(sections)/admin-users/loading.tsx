"use client";

import { TableContainer } from "@/components";
import { tableStyles } from "@/lib/constants/styles.const";
import {
  Spinner,
  Table,
  TableBody,
  TableColumn,
  TableHeader,
} from "@heroui/react";
import { columns } from "./data";

export default function Loading() {
  return (
    <TableContainer>
      <Table {...tableStyles}>
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          )}
        </TableHeader>
        <TableBody
          emptyContent={"No hay zonas para mostrar"}
          isLoading={true}
          loadingContent={<Spinner label="Cargando..." />}
        >
          <></>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
