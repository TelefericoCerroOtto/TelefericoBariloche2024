"use client";

import { TableContainer } from "@/components";
import { TableBody, TableColumn, TableHeader } from "@nextui-org/react";

export default function Table() {
  return (
    <TableContainer>
      <TableHeader>
        <TableColumn>Zona</TableColumn>
        <TableColumn>Horario De Apertura</TableColumn>
        <TableColumn>Hora de Cierre</TableColumn>
        <TableColumn>Acciones</TableColumn>
      </TableHeader>
      <TableBody emptyContent={"No hay zonas para mostrar"}>{[]}</TableBody>
    </TableContainer>
  );
}
