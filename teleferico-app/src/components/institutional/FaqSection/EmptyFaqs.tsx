import { i18n } from "@/i18n";
import type { Locales } from "@/types";

const emptyFaqCopy: Record<Locales, { title: string; description: string }> = {
  "es-AR": {
    title: "Todavía no hay preguntas frecuentes disponibles",
    description:
      "Estamos actualizando esta sección. Volvé a intentarlo más tarde.",
  },
  en: {
    title: "There are no frequently asked questions yet",
    description: "We are updating this section. Please check back again soon.",
  },
  pt: {
    title: "Ainda não há perguntas frequentes disponíveis",
    description: "Estamos atualizando esta seção. Volte a tentar em breve.",
  },
};

export default function EmptyFaqs({ locale }: { locale: Locales }) {
  const copy = emptyFaqCopy[locale] ?? emptyFaqCopy[i18n.defaultLocale];

  return (
    <section className="w-full px-6 py-8 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-8 py-12 text-center shadow-sm">
          <h3 className="text-2xl font-semibold text-foreground">
            {copy.title}
          </h3>
          <p className="mt-3 text-base text-muted-foreground">
            {copy.description}
          </p>
        </div>
      </div>
    </section>
  );
}
