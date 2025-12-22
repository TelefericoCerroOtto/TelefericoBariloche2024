"use client";

import { ButtonDos } from "@/components";
import { useLocale } from "@/hooks";
import { i18n } from "@/i18n";
import type { Locales } from "@/types";
import Link from "next/link";

export default function NotFoundContent() {
  const { locale } = useLocale();

  const dictionaries: Record<
    Locales,
    { title: string; description: string; cta: string; ariaCta: string }
  > = {
    "es-AR": {
      title: "Página no encontrada",
      description:
        "No pudimos encontrar la página que buscabas. Volvé al inicio para seguir explorando.",
      cta: "Ir al inicio",
      ariaCta: "Ir a la página de inicio",
    },
    en: {
      title: "Page Not Found",
      description:
        "We couldn't find the page you were looking for. Head back to the homepage to keep exploring.",
      cta: "Go to homepage",
      ariaCta: "Go to the homepage",
    },
    pt: {
      title: "Página não encontrada",
      description:
        "Não conseguimos encontrar a página que você procurava. Volte para a página inicial para continuar navegando.",
      cta: "Ir para a página inicial",
      ariaCta: "Ir para a página inicial",
    },
  };

  const t = dictionaries[locale] ?? dictionaries[i18n.defaultLocale];

  return (
    <div className="flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold md:text-5xl">{t.title}</h1>
      <p className="mt-4 max-w-xl text-foreground/80 md:text-lg">
        {t.description}
      </p>
      <div className="mt-8">
        <Link href={`/${locale}`} aria-label={t.ariaCta}>
          <ButtonDos intent="solid" size="lg">
            {t.cta}
          </ButtonDos>
        </Link>
      </div>
    </div>
  );
}
