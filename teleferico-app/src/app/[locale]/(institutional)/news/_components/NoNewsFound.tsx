import type { Locales } from "@/types";
import { Newspaper, ArrowRight } from "lucide-react";

interface Props {
  locale: Locales;
  /**
   * Opcional: si querés mostrar un CTA (link/botón) sin hardcodear rutas.
   * Si no lo pasás, no se renderiza.
   */
  cta?: {
    label: string;
    href: string;
  };
}

/**
 * Copy:
 * - headerTitle: título superior (explica el “contexto” del vacío)
 * - title/description: mensaje principal
 * - bullets: guías cortas para el usuario
 */
const copy: Record<
  Locales,
  {
    headerTitle: string;
    headerDesc: string;
    title: string;
    description: string;
    infoTitle: string;
    infoChip: string;
    bullets: string[];
    ctaFallbackLabel: string;
  }
> = {
  "es-AR": {
    headerTitle: "Noticias del complejo",
    headerDesc:
      "En esta sección vas a encontrar comunicados, novedades y anuncios importantes.",
    title: "Todavía no hay noticias publicadas",
    description:
      "Cuando haya novedades, las vas a ver acá. Mientras tanto, podés explorar otras secciones del sitio.",
    infoTitle: "Qué podés hacer ahora",
    infoChip: "Info útil",
    bullets: [
      "Revisá las actividades disponibles y sus requisitos",
      "Consultá tarifas, horarios y medios de pago",
      "Volvé más tarde: esta sección se actualiza con anuncios",
    ],
    ctaFallbackLabel: "Explorar el sitio",
  },
  en: {
    headerTitle: "Resort news",
    headerDesc:
      "This section includes announcements, updates, and important notices.",
    title: "No news published yet",
    description:
      "When updates go live, you’ll see them here. Meanwhile, feel free to explore the rest of the site.",
    infoTitle: "What you can do now",
    infoChip: "Helpful",
    bullets: [
      "Browse available activities and requirements",
      "Check fares, opening hours, and payment options",
      "Come back later—this area updates with announcements",
    ],
    ctaFallbackLabel: "Explore the site",
  },
  pt: {
    headerTitle: "Notícias do complexo",
    headerDesc:
      "Aqui você encontra comunicados, novidades e avisos importantes.",
    title: "Ainda não há notícias publicadas",
    description:
      "Quando houver novidades, elas aparecerão aqui. Enquanto isso, você pode explorar outras seções do site.",
    infoTitle: "O que você pode fazer agora",
    infoChip: "Informação útil",
    bullets: [
      "Veja as atividades disponíveis e os requisitos",
      "Consulte tarifas, horários e formas de pagamento",
      "Volte mais tarde—esta seção é atualizada com avisos",
    ],
    ctaFallbackLabel: "Explorar o site",
  },
};

export default function NewsEmptyState({ locale, cta }: Props) {
  const t = copy[locale];

  return (
    <section
      aria-label={t.headerTitle}
      className="w-full px-4 py-10 sm:px-6 sm:py-14 lg:px-10"
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* Header superior (explica a qué se refiere el vacío) */}
        <header className="mb-6 sm:mb-8">
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t.headerTitle}
          </h2>
          <p className="mt-2 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t.headerDesc}
          </p>
        </header>

        {/* Bloque grande para evitar “demasiado blanco” */}
        <div className="relative overflow-hidden rounded-3xl border border-muted/70 bg-white shadow-sm ring-1 ring-black/5">
          {/* Fondo decorativo (brand-safe, no invade) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            {/* halo rojo */}
            <div className="bg-custom-red/10 absolute -top-40 left-1/2 h-80 w-[55rem] -translate-x-1/2 rounded-full blur-3xl" />
            {/* textura sutil */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] opacity-[0.22] [background-size:20px_20px]" />
            {/* franja inferior para “peso visual” */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-muted/40 to-transparent" />
          </div>

          <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10">
            {/* Columna principal */}
            <div className="text-center lg:text-left">
              <div className="mx-auto mb-5 inline-flex items-center gap-3 lg:mx-0">
                <div className="bg-custom-red/10 ring-custom-red/20 grid h-14 w-14 place-items-center rounded-2xl text-custom-red ring-1">
                  <Newspaper className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-medium text-muted-foreground">
                    Teleférico Cerro Otto
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {t.headerTitle}
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

            {/* Columna secundaria (panel informativo) */}
            <aside
              className="rounded-2xl border border-muted/70 bg-muted/20 p-6 text-left shadow-sm ring-1 ring-black/5 sm:p-7"
              aria-label="Sugerencias"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {t.infoTitle}
                </p>
                <span className="border-custom-red/20 bg-custom-red/5 rounded-full border px-3 py-1 text-xs font-medium text-custom-red">
                  {t.infoChip}
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
                  ? "Tip: si no encontrás lo que buscás, probá navegar por secciones como Actividades, Tarifas y Horarios."
                  : locale === "pt"
                    ? "Dica: se não encontrar o que procura, navegue por seções como Atividades, Tarifas e Horários."
                    : "Tip: if you can’t find what you need, check sections like Activities, Fares, and Hours."}
              </p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
