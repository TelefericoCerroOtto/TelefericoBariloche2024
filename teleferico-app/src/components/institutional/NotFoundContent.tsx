"use client";

import { CustomLink } from "@/components";
import { useLocale } from "@/hooks";
import { i18n } from "@/i18n";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import type { Locales } from "@/types";
import Image from "next/image";

export default function NotFoundContent() {
  const { locale } = useLocale();

  const dictionaries: Record<
    Locales,
    {
      title: string;
      subtitle: string;
      body: string;
      primaryCta: string;
      primaryCtaAria: string;
      secondaryCta: string;
      secondaryCtaAria: string;
      quickLinksTitle: string;
      links: {
        tickets: string;
        schedules: string;
        location: string;
        contact: string;
      };
      sideKicker: string;
      sideBadge: string;
      sideTitle: string;
      sideBody: string;
    }
  > = {
    "es-AR": {
      title: "Página no encontrada",
      subtitle: "Parece que esta vista se perdió en la montaña.",
      body: "La URL puede estar mal escrita o la página fue movida. Volvé al inicio o explorá opciones útiles para planificar tu visita al Cerro Otto.",
      primaryCta: "Ir al inicio",
      primaryCtaAria: "Ir a la página de inicio",
      secondaryCta: "Ver actividades",
      secondaryCtaAria: "Ver actividades del Teleférico Cerro Otto",
      quickLinksTitle: "Accesos rápidos",
      links: {
        tickets: "Tarifas / Tickets",
        schedules: "Horarios",
        location: "Cómo llegar",
        contact: "Contacto",
      },
      sideKicker: "Bariloche · Patagonia",
      sideBadge: "Error 404",
      sideTitle: "Volvamos a la montaña",
      sideBody:
        "Encontrá experiencias, horarios y servicios del Teleférico Cerro Otto para tu visita.",
    },
    en: {
      title: "Page not found",
      subtitle: "It seems this view was lost in the mountains",
      body: "The URL may be misspelled or the page was moved. Head back home or explore key links to plan your visit to Cerro Otto.",
      primaryCta: "Back to home",
      primaryCtaAria: "Go back to the homepage",
      secondaryCta: "See activities",
      secondaryCtaAria: "See activities at Cerro Otto",
      quickLinksTitle: "Quick links",
      links: {
        tickets: "Tickets & prices",
        schedules: "Opening hours",
        location: "How to get here",
        contact: "Contact",
      },
      sideKicker: "Bariloche · Patagonia",
      sideBadge: "Error 404",
      sideTitle: "Back to the mountain",
      sideBody:
        "Find experiences, opening hours, and services from the Teleférico Cerro Otto for your Bariloche trip.",
    },
    pt: {
      title: "Página não encontrada",
      subtitle: "Parece que essa vista se perdeu nas montanhas.",
      body: "A URL pode estar incorreta ou a página foi movida. Volte ao início ou explore links úteis para planejar sua visita ao Cerro Otto.",
      primaryCta: "Ir para o início",
      primaryCtaAria: "Ir para a página inicial",
      secondaryCta: "Ver atividades",
      secondaryCtaAria: "Ver atividades no Teleférico Cerro Otto",
      quickLinksTitle: "Acessos rápidos",
      links: {
        tickets: "Ingressos e tarifas",
        schedules: "Horários",
        location: "Como chegar",
        contact: "Contato",
      },
      sideKicker: "Bariloche · Patagônia",
      sideBadge: "Erro 404",
      sideTitle: "Vamos voltar à montanha",
      sideBody:
        "Encontre experiências, horários e serviços do Teleférico Cerro Otto para sua visita.",
    },
  };

  const t = dictionaries[locale] ?? dictionaries[i18n.defaultLocale];

  const quickLinks = [
    { href: PUBLIC_ROUTES.PRICINGSCHEDULES, label: t.links.tickets },
    {
      href: `${PUBLIC_ROUTES.PRICINGSCHEDULES}#horarios`,
      label: t.links.schedules,
    },
    { href: PUBLIC_ROUTES.LOCATION, label: t.links.location },
    { href: PUBLIC_ROUTES.CONTACT, label: t.links.contact },
  ];

  return (
    <main
      aria-labelledby="not-found-title"
      className="relative overflow-hidden bg-background"
    >
      {/* Background (solo tokens del sistema) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="absolute -top-40 right-[-120px] h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-52 left-[-160px] h-[560px] w-[560px] rounded-full bg-primary/10 blur-3xl" />

        {/* Watermark marca */}
        <div className="absolute left-1/2 top-10 w-[320px] -translate-x-1/2 opacity-[0.06] sm:w-[420px] lg:top-14 lg:w-[600px]">
          <Image
            src="/logo-recortado.svg"
            alt=""
            width={600}
            height={220}
            className="-rotate-6"
            priority
          />
        </div>

        {/* “línea de cable” minimal */}
        <div className="absolute left-0 right-0 top-20 hidden h-px bg-border/60 lg:block" />
        <div className="absolute left-1/2 top-[78px] hidden h-2 w-2 -translate-x-1/2 rounded-full bg-primary/80 lg:block" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl items-center px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
        {/* ÚNICO “CUADRO” */}
        <section className="relative w-full overflow-hidden rounded-3xl border border-border/60 bg-card/85 shadow-xl backdrop-blur">
          {/* Fondo oscuro del “lado 404” en desktop, dentro del mismo cuadro */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-foreground lg:block"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-gradient-to-br from-primary/20 via-transparent to-transparent lg:block"
            aria-hidden="true"
          />

          <div className="relative grid lg:grid-cols-[1fr_0.72fr]">
            {/* Columna izquierda: contenido */}
            <div className="xl:p-14 p-7 sm:p-9 lg:p-12">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.svg"
                  alt="Teleférico Cerro Otto"
                  width={160}
                  height={44}
                  className="h-10 w-auto sm:h-11"
                  priority
                />
                <span className="h-6 w-px bg-border/70" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-foreground/70">
                  Teleférico Cerro Otto
                </p>
              </div>

              <header className="mt-6 space-y-4">
                <h1
                  id="not-found-title"
                  className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
                >
                  {t.title}
                </h1>

                <p className="text-base font-semibold text-primary sm:text-lg lg:text-xl">
                  {t.subtitle}
                </p>

                <p className="text-base text-foreground/80 sm:text-lg">
                  {t.body}
                </p>
              </header>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <CustomLink
                  href={PUBLIC_ROUTES.HOME}
                  withButtonStyles
                  intent="solid"
                  size="lg"
                  fontSize="default"
                  className="w-full justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:w-auto"
                  aria-label={t.primaryCtaAria}
                >
                  {t.primaryCta}
                </CustomLink>

                <CustomLink
                  href={PUBLIC_ROUTES.ACTIVITIES}
                  withButtonStyles
                  intent="outlineRed"
                  size="lg"
                  fontSize="default"
                  className="w-full justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:w-auto"
                  aria-label={t.secondaryCtaAria}
                >
                  {t.secondaryCta}
                </CustomLink>
              </div>

              <div className="mt-9">
                <h2 className="text-base font-semibold text-foreground">
                  {t.quickLinksTitle}
                </h2>

                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {quickLinks.map((link) => (
                    <li key={link.href}>
                      <CustomLink
                        href={link.href}
                        className="group flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      >
                        <span>{link.label}</span>
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-1 w-10 rounded-full bg-border transition-all group-hover:w-14 group-hover:bg-primary/70"
                          />
                          <span
                            aria-hidden="true"
                            className="text-foreground/60 transition group-hover:text-primary"
                          >
                            →
                          </span>
                        </span>
                      </CustomLink>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-foreground/60">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-primary/70"
                    aria-hidden="true"
                  />
                  <span>{t.sideKicker}</span>
                </span>
                <span className="hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-foreground/30"
                    aria-hidden="true"
                  />
                  <span>Teleférico Cerro Otto</span>
                </span>
              </div>
            </div>

            {/* Columna derecha: 404 / marca (integrado al MISMO cuadro) */}
            <div className="relative lg:border-l lg:border-background/10">
              {/* En mobile, esta sección “se pega” al borde del cuadro para no parecer un segundo card */}
              <div className="xl:px-12 xl:py-14 relative -mx-0 bg-foreground px-7 py-9 text-background sm:px-9 lg:mx-0 lg:bg-transparent lg:px-10 lg:py-12">
                {/* 404 grande (visual) */}
                <div
                  className="xl:text-[190px] pointer-events-none absolute right-6 top-6 select-none text-[120px] font-black leading-none text-background/10 sm:text-[150px] lg:text-[170px]"
                  aria-hidden="true"
                >
                  404
                </div>

                {/* glows sutiles */}
                <div
                  className="pointer-events-none absolute -right-24 top-10 h-48 w-48 rounded-full bg-background/10 blur-2xl"
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
                  aria-hidden="true"
                />

                <div className="relative space-y-5">
                  <Image
                    src="/logo-blanco.svg"
                    alt="Teleférico Cerro Otto"
                    width={220}
                    height={64}
                    className="h-10 w-auto sm:h-12"
                    priority
                  />

                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-background/70">
                    {t.sideKicker}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-background/30 bg-background/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-background/80">
                      {t.sideBadge}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-background/15 bg-background/10 p-6">
                    <p className="text-xl font-semibold sm:text-2xl">
                      {t.sideTitle}
                    </p>
                    <p className="mt-2 text-sm text-background/80 sm:text-base">
                      {t.sideBody}
                    </p>

                    <div className="mt-5">
                      <CustomLink
                        href={PUBLIC_ROUTES.HOME}
                        className="inline-flex w-fit items-center gap-2 font-semibold text-background/90 transition hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                        aria-label={t.primaryCtaAria}
                      >
                        <span>{t.primaryCta}</span>
                        <span aria-hidden="true">→</span>
                      </CustomLink>
                    </div>
                  </div>

                  {/* micro detalle: “cable” interno para reforzar identidad */}
                  <div className="hidden lg:block">
                    <div
                      className="h-px w-full bg-background/15"
                      aria-hidden="true"
                    />
                    <div className="mt-3 flex items-center justify-between text-xs text-background/60">
                      <span>Teleférico Cerro Otto</span>
                      <span aria-hidden="true">·</span>
                      <span>{t.sideKicker}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
