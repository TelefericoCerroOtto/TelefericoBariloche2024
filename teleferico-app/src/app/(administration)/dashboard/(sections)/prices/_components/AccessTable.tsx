import { TableContainer } from "@/components";
import { TableBody, TableColumn, TableHeader } from "@nextui-org/react";

export default function AccessTable() {
  return (
    <TableContainer>
      <TableHeader>
        <TableColumn>Tipo de Ticket</TableColumn>
        <TableColumn>Medio De Elevación</TableColumn>
        <TableColumn>Precio Por Persona</TableColumn>
        <TableColumn>Acciones</TableColumn>
      </TableHeader>
      <TableBody emptyContent={"No hay tarifas para mostrar"}>{[]}</TableBody>
    </TableContainer>
  );
}
