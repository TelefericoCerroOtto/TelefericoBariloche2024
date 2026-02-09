import { i18n } from "@/i18n";
import type { Locales } from "@/types";
import { Sparkles, ArrowRight } from "lucide-react";

interface Props {
  locale: Locales;
  /**
   * Opcional: CTA para llevar a otra sección (sin hardcodear rutas).
   */
  cta?: {
    label: string;
    href: string;
  };
}

const copy: Record<
  Locales,
  {
    headerTitle: string;
    headerDesc: string;
    title: string;
    description: string;
    bullets: string[];
    badge: string;
  }
> = {
  "es-AR": {
    headerTitle: "Noticias destacadas",
    headerDesc:
      "Acá reunimos los contenidos más relevantes: anuncios importantes, eventos y novedades para planificar tu visita.",
    title: "No hay noticias destacadas por ahora",
    description:
      "Estamos preparando nuevas historias para destacar. Volvé a visitarnos pronto.",
    bullets: [
      "Explorá todas las noticias publicadas (si hay)",
      "Revisá actividades y servicios del complejo",
      "Volvé más tarde para ver próximos destacados",
    ],
    badge: "Destacados",
  },
  en: {
    headerTitle: "Featured news",
    headerDesc:
      "Here we highlight the most relevant posts: important announcements, events, and key updates to plan your visit.",
    title: "No featured news right now",
    description:
      "We are preparing new highlights. Please check back again soon.",
    bullets: [
      "Browse all published news (if available)",
      "Check activities and resort services",
      "Come back later for new highlights",
    ],
    badge: "Featured",
  },
  pt: {
    headerTitle: "Notícias em destaque",
    headerDesc:
      "Aqui destacamos os conteúdos mais relevantes: avisos importantes, eventos e novidades para planejar sua visita.",
    title: "Nenhuma notícia em destaque no momento",
    description:
      "Estamos preparando novos destaques. Volte novamente em breve.",
    bullets: [
      "Veja todas as notícias publicadas (se houver)",
      "Confira atividades e serviços do complexo",
      "Volte mais tarde para novos destaques",
    ],
    badge: "Destaques",
  },
};

function FeaturedMark() {
  return (
    <div
      aria-hidden="true"
      className="bg-custom-red/10 ring-custom-red/20 grid h-14 w-14 place-items-center rounded-2xl text-custom-red ring-1"
    >
      <Sparkles className="h-6 w-6" />
    </div>
  );
}

export default function NoFeaturedNewsFound({ locale, cta }: Props) {
  const t = copy[locale] ?? copy[i18n.defaultLocale];

  // Labels secundarios localizados (para no mezclar idiomas en UI).
  const sideTitle =
    locale === "pt"
      ? "Sugestões"
      : locale === "en"
        ? "Suggestions"
        : "Sugerencias";

  const sideBadge =
    locale === "pt"
      ? "Informação útil"
      : locale === "en"
        ? "Helpful"
        : "Info útil";

  return (
    <section
      aria-label={t.headerTitle}
      aria-live="polite"
      role="status"
      className="w-full px-4 py-10 sm:px-6 sm:py-14 lg:px-10"
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* Título superior (contexto del estado vacío) */}
        <header className="mb-6 sm:mb-8">
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t.headerTitle}
          </h2>
          <p className="mt-2 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t.headerDesc}
          </p>
        </header>

        {/* Bloque principal (más “peso visual” para evitar blanco) */}
        <div className="relative overflow-hidden rounded-3xl border border-muted/70 bg-white shadow-sm ring-1 ring-black/5">
          {/* Fondo decorativo sutil */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="bg-custom-red/10 absolute -top-44 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] opacity-[0.22] [background-size:20px_20px]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-muted/40 to-transparent" />
          </div>

          <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10">
            {/* Contenido principal */}
            <div className="text-center lg:text-left">
              <div className="mx-auto mb-5 inline-flex items-center gap-3 lg:mx-0">
                <FeaturedMark />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-medium text-muted-foreground">
                    Teleférico Cerro Otto
                  </span>
                  <span className="border-custom-red/20 bg-custom-red/5 inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold text-custom-red">
                    {t.badge}
                  </span>
                </div>
              </div>

              <h3 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t.title}
              </h3>

              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t.description}
              </p>

              {cta?.href ? (
                <div className="mt-6 flex justify-center lg:justify-start">
                  <a
                    href={cta.href}
                    className="ring-custom-red/40 inline-flex items-center gap-2 rounded-full bg-custom-red px-5 py-3 text-sm font-semibold text-white shadow-sm ring-1 transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-custom-red focus-visible:ring-offset-2"
                    aria-label={cta.label}
                  >
                    {cta.label}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              ) : null}
            </div>

            {/* Panel secundario */}
            <aside
              className="rounded-2xl border border-muted/70 bg-muted/20 p-6 text-left shadow-sm ring-1 ring-black/5 sm:p-7"
              aria-label={sideTitle}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {sideTitle}
                </p>
                <span className="border-custom-red/20 bg-custom-red/5 rounded-full border px-3 py-1 text-xs font-medium text-custom-red">
                  {sideBadge}
                </span>
              </div>

              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {t.bullets.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="bg-custom-red/70 mt-1.5 h-2 w-2 flex-none rounded-full"
                    />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              <div
                aria-hidden="true"
                className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-muted-foreground/25 to-transparent"
              />

              <p className="mt-5 text-xs leading-relaxed text-muted-foreground/90">
                {locale === "es-AR"
                  ? "Cuando existan noticias destacadas, van a aparecer primero en esta sección."
                  : locale === "pt"
                    ? "Quando houver notícias em destaque, elas aparecerão primeiro nesta seção."
                    : "When featured stories are available, they’ll appear here first."}
              </p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
