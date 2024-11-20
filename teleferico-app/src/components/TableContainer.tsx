"use client";

import { Table } from "@nextui-org/react";

// TODO: Tipar correctamente a "children"
export default function TableContainer({ children }: { children: any }) {
  return (
    <div className="overflow-scroll">
      <Table
        removeWrapper
        aria-label="Example empty table"
        classNames={{
          thead: "border-b border-b-custom-border ",
          table: "bg-white",
          th: "bg-white font-bold text-black",
        }}
      >
        {children}
      </Table>
    </div>
  );
}
