import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administración - Teleferico Cerro Otto",
  description:
    "Panel de administración para ver y gestionar el contenido del sitio",
};

export default function AdministrationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
