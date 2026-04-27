import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Estudio del pipeline de imágenes",
  description: "Estudio local para preparar y procesar lotes de imágenes con jobs.json.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark" data-theme="dark">
      <body className="bg-background text-foreground">{children}</body>
    </html>
  );
}
