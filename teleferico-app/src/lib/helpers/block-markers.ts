/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Block marker helpers for Strapi BlocksContent.
 *
 * WHY:
 * We store component translations in Strapi as rich text blocks (BlocksContent).
 * Some of those translations include operational times (open/close) that change
 * frequently. Hardcoding times in translation text forces content edits whenever
 * schedules change.
 *
 * WHAT:
 * This helper enables "markers" inside text nodes, e.g.:
 *   "{base.openTime}", "{base.closeTime}"
 * where "base" maps to Zone.label (unique) in Strapi and the field is one of
 * openTime/closeTime.
 *
 * HOW:
 * 1) We traverse the BlocksContent tree and extract all marker labels used.
 * 2) We fetch the relevant Zone records by those labels.
 * 3) We replace markers in every text node with the resolved time values
 *    (normalized to "hh:mm").
 *
 * TRADE-OFFS / LIMITATIONS:
 * - Markers are replaced only when they appear fully inside a single text node.
 * - If a Zone/field is missing, the marker is left as-is (safe failure) to avoid
 *   breaking rendering and to make missing data visible during QA.
 * - This is intentionally pragmatic and avoids introducing a custom Strapi plugin
 *   or a more complex content model due to delivery timelines.
 */

import type { BlocksContent } from "@strapi/blocks-react-renderer";

type TimeField = "openTime" | "closeTime";

const MARKER_RE = /\{([a-zA-Z0-9_-]+)\.(openTime|closeTime)\}/g;

// eslint-disable-next-line no-unused-vars
function walk(node: any, visit: (n: any) => void) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, visit));
    return;
  }
  if (typeof node === "object") {
    visit(node);
    for (const key of Object.keys(node)) {
      walk((node as any)[key], visit);
    }
  }
}

export function extractZoneLabelsFromBlocks(blocks: BlocksContent): string[] {
  const labels = new Set<string>();

  walk(blocks, (n) => {
    if (typeof n?.text === "string") {
      const text = n.text as string;
      let match: RegExpExecArray | null;
      MARKER_RE.lastIndex = 0;
      while ((match = MARKER_RE.exec(text))) {
        labels.add(match[1]); // label
      }
    }
  });

  return [...labels];
}

export function replaceMarkersInBlocks(
  blocks: BlocksContent,
  values: Record<string, string>,
): BlocksContent {
  // deep clone simple
  const cloned = structuredClone(blocks) as BlocksContent;

  walk(cloned, (n) => {
    if (typeof n?.text === "string") {
      n.text = (n.text as string).replace(
        MARKER_RE,
        (_full, label: string, field: TimeField) => {
          const key = `${label}.${field}`;
          return values[key] ?? _full; // si falta, deja el marker para no romper copy
        },
      );
    }
  });

  return cloned;
}

export function normalizeStrapiTime(value?: string | null): string | null {
  if (!value) return null;
  // cubre "10:00:00.000" / "10:00:00" / "10:00"
  if (value.length >= 5) return value.slice(0, 5);
  return value;
}
