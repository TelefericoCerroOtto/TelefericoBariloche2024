"use client";

import { TableContainer } from "@/components";
import { tableStyles } from "@/utils/styles";
import { Table, TableBody, TableColumn, TableHeader } from "@nextui-org/react";

export default function ZonesTable() {
  return (
    <TableContainer>
      <Table {...tableStyles}>
        <TableHeader>
          <TableColumn>Zona</TableColumn>
          <TableColumn>Horario De Apertura</TableColumn>
          <TableColumn>Hora de Cierre</TableColumn>
          <TableColumn>Acciones</TableColumn>
        </TableHeader>
        <TableBody emptyContent={"No hay zonas para mostrar"}>{[]}</TableBody>
      </Table>
    </TableContainer>
  );
}
