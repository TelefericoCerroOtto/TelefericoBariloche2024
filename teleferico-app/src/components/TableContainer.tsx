"use client";

import type { ReactNode } from "react";

// TODO: Tipar correctamente a "children"
export default function TableContainer({ children }: { children: ReactNode }) {
  return <div className="overflow-scroll">{children}</div>;
}
