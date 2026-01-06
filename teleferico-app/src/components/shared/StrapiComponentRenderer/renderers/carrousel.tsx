import Carrousel, {
  type CarrouselSlide,
} from "@/components/institutional/Carrousel";
import type {
  Carrousel as StrapiCarrousel,
  CarrouselItem as StrapiCarrouselItem,
} from "@/types";
import type { RendererMap } from "../shared/types";

const MAX_ITEMS = 15;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function adaptItem(item: StrapiCarrouselItem): CarrouselSlide | null {
  // Shape real (según tu log): item.cover.image.url
  const url = item.cover?.image?.url;

  if (!isNonEmptyString(url)) return null;

  const alt =
    (isNonEmptyString(item.cover?.alt) && item.cover.alt) ||
    (isNonEmptyString(item.cover?.image?.alternativeText) &&
      item.cover.image.alternativeText) ||
    (isNonEmptyString(item.title) && item.title) ||
    "";

  const link =
    item.link &&
    isNonEmptyString(item.link.href) &&
    isNonEmptyString(item.link.label)
      ? { href: item.link.href, label: item.link.label }
      : null;

  return {
    id: item.id,
    title: item.title ?? null,
    epigraph: item.epigraph ?? null,
    description: item.description ?? null, // BlocksContent | null
    link,
    image: {
      url, // "/uploads/..." (tu rewrite lo resuelve)
      altText: alt,
    },
  };
}

function adaptItems(items: StrapiCarrouselItem[]): CarrouselSlide[] {
  return (items ?? [])
    .slice(0, MAX_ITEMS)
    .map(adaptItem)
    .filter((x): x is CarrouselSlide => Boolean(x));
}

export const renderCarrousel: RendererMap["page-components.carrousel"] = (
  block,
) => {
  const typed = block as StrapiCarrousel;

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("Carrousel block:", JSON.stringify(typed, null, 2));
  }

  const slides = adaptItems(typed.items);

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("Adapted slides:", slides);
  }

  const autoplayMs = typed.autoplayMs ?? 0;

  // NEW: si por algún motivo el contenido viejo no trae el campo, default = true
  const pauseOnHover = (typed as Partial<StrapiCarrousel>).pauseOnHover ?? true;

  if (slides.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Carrousel: 0 slides adaptadas. Esperaba{" "}
          <code className="font-mono">cover.image.url</code>.
        </div>
      );
    }
    return null;
  }

  return (
    <Carrousel
      items={slides}
      autoplayMs={autoplayMs}
      pauseOnHover={pauseOnHover}
    />
  );
};
