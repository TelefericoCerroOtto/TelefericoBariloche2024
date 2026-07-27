import { auth } from "@/auth";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "Administración - Teleferico Cerro Otto",
  description:
    "Panel de administración para ver y gestionar el contenido del sitio",
};

// Provides the NextAuth SessionProvider for all administration routes,
// including login and logout, which need client-side session access.
// Auth enforcement (fail-closed guard) lives in dashboard/layout.tsx,
// scoped to the protected subtree only.
export default async function AdministrationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus
      refetchInterval={60}
    >
      {children}
    </SessionProvider>
  );
}
