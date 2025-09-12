import { auth } from "@/auth";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "Administración - Teleferico Cerro Otto",
  description:
    "Panel de administración para ver y gestionar el contenido del sitio",
};

export default async function AdministrationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return <SessionProvider session={session}>{children}</SessionProvider>;
}
