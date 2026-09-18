import "@/app/globals.css";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";

export const metadata: Metadata = {
  icons: { icon: "/favicon.ico?v=2" },
};

const outfit = Outfit({ subsets: ["latin"], display: "swap" });

export default function QrLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`antialiased ${outfit.className}`}>{children}</body>
    </html>
  );
}
