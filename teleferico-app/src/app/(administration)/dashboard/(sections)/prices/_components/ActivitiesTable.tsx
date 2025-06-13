import { TableContainer } from "@/components";
import { tableStyles } from "@/utils/styles";
import { Table, TableBody, TableColumn, TableHeader } from "@heroui/react";

export default function ActivitiesTable() {
  return (
    <TableContainer>
      <Table {...tableStyles}>
        <TableHeader>
          <TableColumn>Actividad</TableColumn>
          <TableColumn>Precio Por Persona</TableColumn>
          <TableColumn>Edad Mínima</TableColumn>
          <TableColumn>Temporada</TableColumn>
          <TableColumn>Requisitos</TableColumn>
          <TableColumn>Acciones</TableColumn>
        </TableHeader>
        <TableBody emptyContent={"No hay tarifas para mostrar"}>{[]}</TableBody>
      </Table>
    </TableContainer>
  );
}
