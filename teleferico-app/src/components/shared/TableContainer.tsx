"use client";
import type { ReactNode } from "react";

export default function TableContainer({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
