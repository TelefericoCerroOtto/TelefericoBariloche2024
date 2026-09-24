import { BlockRendererClient, CustomLink } from "@/components";
import type { EditorialAlertVariant, Link } from "@/types";
import {
  Info,
  MessageSquareText,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { BlocksContent } from "@strapi/blocks-react-renderer";

interface Props {
  id: number;
  title: string;
  description: BlocksContent;
  variant: EditorialAlertVariant;
  epigraph?: string | null;
  link?: Link | null;
}

const PRESENTATION = {
  default: {
    Icon: MessageSquareText,
    surface: "border-custom-border bg-background text-foreground",
    badge: "bg-foreground/5 ring-1 ring-custom-border",
    icon: "text-foreground/70",
    epigraphClass: "text-foreground/70",
    richText: "neutral",
  },
  promotion: {
    Icon: Sparkles,
    surface: "border-foreground bg-foreground text-background",
    badge: "bg-background/10 ring-1 ring-background/30",
    icon: "text-background",
    epigraphClass: "text-background/70",
    richText: "light",
  },
  warning: {
    Icon: TriangleAlert,
    surface: "border-custom-red bg-custom-red text-background",
    badge: "bg-background/10 ring-1 ring-background/30",
    icon: "text-background",
    epigraphClass: "text-background",
    richText: "light",
  },
  info: {
    Icon: Info,
    surface: "border-[#3B70CB] bg-[#3B70CB] text-background",
    badge: "bg-foreground/25 ring-1 ring-background/35",
    icon: "text-background",
    epigraphClass: "text-background",
    richText: "light",
  },
} satisfies Record<
  EditorialAlertVariant,
  {
    Icon: typeof MessageSquareText;
    surface: string;
    badge: string;
    icon: string;
    epigraphClass: string;
    richText: "neutral" | "light";
  }
>;

const OPAQUE_LIGHT_TEXT_PROSE_CLASSES =
  "prose-invert [&_a]:!text-background [&_blockquote]:!text-background [&_code]:!text-background [&_em]:!text-background [&_h1]:!text-background [&_h2]:!text-background [&_h3]:!text-background [&_h4]:!text-background [&_h5]:!text-background [&_h6]:!text-background [&_li::marker]:!text-background [&_li]:!text-background [&_ol]:!text-background [&_p]:!text-background [&_pre]:!text-background [&_strong]:!text-background [&_td]:!text-background [&_th]:!text-background [&_ul]:!text-background";

const NEUTRAL_PROSE_CLASSES =
  "[&_a]:text-foreground [&_blockquote]:text-foreground/80 [&_li]:text-foreground/80 [&_p]:text-foreground/80";

const CTA_PRESENTATION = {
  default:
    "border-foreground/40 text-foreground focus-visible:ring-primary focus-visible:ring-offset-background",
  promotion:
    "border-[hsl(0_88%_49%)] bg-[hsl(0_88%_49%)] text-white focus-visible:ring-[hsl(0_88%_49%)] focus-visible:ring-offset-foreground",
  warning:
    "border-foreground bg-foreground text-background focus-visible:ring-background focus-visible:ring-offset-custom-red",
  info:
    "border-foreground bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-background focus-visible:ring-offset-[#3B70CB]",
} satisfies Record<EditorialAlertVariant, string>;

function isSafeEditorialHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (value.startsWith("#")) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;

  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export default function EditorialAlert({
  id,
  title,
  description,
  variant,
  epigraph,
  link,
}: Props) {
  const { Icon, surface, badge, icon, epigraphClass, richText } =
    PRESENTATION[variant];
  const headingId = `editorial-alert-heading-${id}`;
  const safeLink = link && isSafeEditorialHref(link.href) ? link : null;

  return (
    <section aria-labelledby={headingId} className="my-6 w-full px-6 md:px-12">
      <article
        data-variant={variant}
        className={`mx-auto grid w-full max-w-[1536px] grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-[2.75rem_minmax(0,1fr)] sm:items-start sm:gap-x-4 sm:p-4 md:grid-cols-[2.75rem_minmax(0,1fr)_auto] md:items-center ${surface}`}
      >
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 items-center justify-center rounded-md ${badge}`}
        >
          <Icon className={`h-5 w-5 ${icon}`} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {epigraph ? (
              <p
                className={`text-xs font-bold uppercase tracking-[0.2em] ${epigraphClass}`}
              >
                {epigraph}
              </p>
            ) : null}
            <h2
              id={headingId}
              className="text-pretty text-xl font-bold leading-tight tracking-tight sm:text-2xl"
            >
              {title}
            </h2>
          </div>
          <BlockRendererClient
            content={description}
            prosePreset="compact"
            className={`mt-1 max-w-none text-pretty [&_li]:my-0 [&_ol]:my-1 [&_p]:my-0 [&_ul]:my-1 ${richText === "light" ? OPAQUE_LIGHT_TEXT_PROSE_CLASSES : NEUTRAL_PROSE_CLASSES}`}
          />
        </div>
        {safeLink ? (
          <CustomLink
            href={safeLink.href}
            className={`inline-flex min-h-11 w-fit items-center justify-center justify-self-start rounded-md border px-4 py-2 text-sm font-bold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:col-start-2 sm:justify-self-end md:col-start-3 md:row-start-1 md:self-center ${CTA_PRESENTATION[variant]}`}
          >
            {safeLink.label}
          </CustomLink>
        ) : null}
      </article>
    </section>
  );
}
