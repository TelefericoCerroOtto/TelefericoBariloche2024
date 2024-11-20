import { Table, TableBody, TableColumn, TableHeader } from "@nextui-org/react";

export default function ActivitiesTable() {
  return (
    <Table removeWrapper aria-label="Example empty table">
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
  );
}
