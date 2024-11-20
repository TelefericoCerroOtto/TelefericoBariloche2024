"use client";

import {
  Table as NextUITable,
  TableBody,
  TableColumn,
  TableHeader,
} from "@nextui-org/react";

export default function Table() {
  return (
    <NextUITable removeWrapper aria-label="Example empty table">
      <TableHeader>
        <TableColumn>Zona</TableColumn>
        <TableColumn>Horario De Apertura</TableColumn>
        <TableColumn>Hora de Cierre</TableColumn>
        <TableColumn>Acciones</TableColumn>
      </TableHeader>
      <TableBody emptyContent={"No hay zonas para mostrar"}>{[]}</TableBody>
    </NextUITable>
  );
}
