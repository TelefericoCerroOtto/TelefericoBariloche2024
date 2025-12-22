"use client";

import { useLocale } from "@/hooks";
import { NotFoundContent } from "@/components";
import "./globals.css";

export default function NotFound() {
  const { locale } = useLocale();

  return (
    <html lang={locale}>
      <body>
        <NotFoundContent />
      </body>
    </html>
  );
}
