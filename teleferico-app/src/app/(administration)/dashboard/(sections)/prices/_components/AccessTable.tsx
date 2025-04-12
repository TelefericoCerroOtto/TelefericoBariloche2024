import { TableContainer } from "@/components";
import { tableStyles } from "@/utils/styles";
import { Table, TableBody, TableColumn, TableHeader } from "@nextui-org/react";

export default function AccessTable() {
  return (
    <TableContainer>
      <Table {...tableStyles}>
        <TableHeader>
          <TableColumn>Tipo de Ticket</TableColumn>
          <TableColumn>Medio De Elevación</TableColumn>
          <TableColumn>Precio Por Persona</TableColumn>
          <TableColumn>Acciones</TableColumn>
        </TableHeader>
        <TableBody emptyContent={"No hay tarifas para mostrar"}>{[]}</TableBody>
      </Table>
    </TableContainer>
  );
}
