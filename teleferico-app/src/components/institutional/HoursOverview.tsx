/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlockRendererClient, TitleDescBlock } from "@/components";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import { getComponentTranslation } from "@/lib/services";

import bus from "@/public/busInfo.png";
import cerro from "@/public/cerroInfo.png";
import gondola from "@/public/gondolaInfo.png";

import type { Locales, Zone } from "@/types";
import { stringifyQuery } from "@/utils";
import { Spacer } from "@heroui/react";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import Image from "next/image";
import qs from "qs";

interface Props {
  locale: Locales;
  withTextBlock: boolean;
}

const ICON_ITEMS = [
  { tag: "cablecar", src: gondola.src },
  { tag: "mountain", src: cerro.src },
  { tag: "bus", src: bus.src },
] as const;

/**
 * Markers permitidos:
 *  - {label.openTime}
 *  - {label.closeTime}
 *
 * label => Zone.label (unique)
 */
const MARKER_RE = /\{([a-zA-Z0-9_-]+)\.(openTime|closeTime)\}/g;

type TimeField = "openTime" | "closeTime";

function normalizeStrapiTime(value?: string | null): string | null {
  if (!value) return null;
  // "10:00:00" => "10:00"
  return value.length >= 5 ? value.slice(0, 5) : value;
}

// eslint-disable-next-line no-unused-vars
function walkNode(node: any, visit: (n: any) => void) {
  if (!node) return;

  if (Array.isArray(node)) {
    node.forEach((n) => walkNode(n, visit));
    return;
  }

  if (typeof node === "object") {
    visit(node);
    for (const key of Object.keys(node)) {
      walkNode(node[key], visit);
    }
  }
}

function extractZoneLabelsFromBlocks(blocks: BlocksContent): string[] {
  const labels = new Set<string>();

  walkNode(blocks, (n) => {
    if (typeof n?.text !== "string") return;

    MARKER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MARKER_RE.exec(n.text))) {
      labels.add(match[1]); // label
    }
  });

  return [...labels];
}

function replaceMarkersInBlocks(
  blocks: BlocksContent,
  values: Record<string, string>,
): BlocksContent {
  const cloned = structuredClone(blocks) as BlocksContent;

  walkNode(cloned, (n) => {
    if (typeof n?.text !== "string") return;

    n.text = n.text.replace(
      MARKER_RE,
      (full: string, label: string, field: TimeField) => {
        const key = `${label}.${field}`;
        return values[key] ?? full; // si falta, deja el marker literal
      },
    );
  });

  return cloned;
}

async function getZonesByLabels(labels: string[]) {
  // IMPORTANTE: esto es intencionalmente “mínimo”: solo fields necesarios.
  // Si tu strapiFetch ya arma el base URL, podés pasar endpoint+query en vez de getStrapiURL.
  const query = qs.stringify(
    {
      filters: { label: { $in: labels } },
      fields: ["label", "openTime", "closeTime"],
      pagination: { pageSize: Math.max(labels.length, 10) },
    },
    { encodeValuesOnly: true },
  );

  return strapiFetch<{ data: Zone[] }>({
    endpoint: STRAPI_ENDPOINTS.ZONES,
    qp: stringifyQuery(query),
  });
}

function HoursOverviewItems({
  items,
}: {
  items: {
    id: number;
    tag: string;
    src: string;
    alt: string;
    title: string;
    desc: BlocksContent;
  }[];
}) {
  return (
    <div className="mb-12 flex max-w-[1376px] flex-col items-center gap-8 px-4 text-center sm:px-8 md:gap-10 md:px-14 lg:flex-row">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex max-w-[450px] flex-col items-center gap-2 text-center"
        >
          <Image src={item.src} alt={item.alt} width={72} height={72} />
          <h4 className="text-2xl font-bold sm:text-3xl md:text-4xl">
            {item.title}
          </h4>
          <BlockRendererClient
            content={item.desc}
            prosePreset="feature"
            className="max-sm:prose-xl"
          />
        </div>
      ))}
    </div>
  );
}

export default async function HoursOverview(props: Props) {
  const { locale, withTextBlock } = props;

  const { ok, data } = await getComponentTranslation(locale, "hoursoverview");
  if (!ok) {
    throw new Error("No se pudo recuperar la informacion de HoursOverview");
  }

  const content = data.data[0].jsonValue as {
    title: string;
    desc: BlocksContent;
    items: Array<{
      id: number;
      alt: string;
      tag: string;
      title: string;
      desc: BlocksContent;
    }>;
  };

  // 1) extraer labels desde todo el contenido (desc general + desc de items)
  const labels = new Set<string>();
  extractZoneLabelsFromBlocks(content.desc).forEach((l) => labels.add(l));
  content.items.forEach((it) =>
    extractZoneLabelsFromBlocks(it.desc).forEach((l) => labels.add(l)),
  );

  // 2) traer zonas por label y armar diccionario de valores
  let markerValues: Record<string, string> = {};
  if (labels.size > 0) {
    const zonesRes = await getZonesByLabels([...labels]);

    if (zonesRes.ok) {
      const map: Record<string, string> = {};

      for (const zone of zonesRes.data.data) {
        const label = zone.label;

        const open = normalizeStrapiTime(zone.openTime);
        const close = normalizeStrapiTime(zone.closeTime);

        if (open) map[`${label}.openTime`] = open;
        if (close) map[`${label}.closeTime`] = close;
      }

      markerValues = map;
    }
  }

  // 3) reemplazar markers en los blocks
  const descWithTimes = replaceMarkersInBlocks(content.desc, markerValues);

  const itemsIntl = content.items.map((item) => {
    const icon = ICON_ITEMS.find((itm) => itm.tag === item.tag);
    if (!icon) {
      // si hay un tag que no matchea, lo dejamos sin icono (o lanzás error)
      throw new Error(
        `HoursOverview: no icon configured for tag "${item.tag}"`,
      );
    }

    return {
      ...item,
      src: icon.src,
      desc: replaceMarkersInBlocks(item.desc, markerValues),
    };
  });

  if (withTextBlock) {
    return (
      <section className="mb-14 text-base sm:text-lg">
        <TitleDescBlock
          title={content.title}
          desc={descWithTimes}
          descProsePreset="section"
          descClassName="md:prose-3xl"
        />
        <Spacer y={16} />
        <HoursOverviewItems items={itemsIntl} />
      </section>
    );
  }

  return <HoursOverviewItems items={itemsIntl} />;
}
