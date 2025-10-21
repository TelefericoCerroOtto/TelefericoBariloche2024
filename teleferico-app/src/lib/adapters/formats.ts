import type { TimeValue } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import { type JSONContent } from "@tiptap/react";

export const TimeValueToStrapiTime = (time: TimeValue): string => {
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${pad(time.hour)}:${pad(time.mins)}:00`;
};

/**
 * Convierte un string en formato hh:mm:ss a hh:mm
 * @throws Error si el formato no es válido
 */
export function StrapiTimeToTableRecordTime(time: string): string {
  const regex = /^(\d{2}):(\d{2}):(\d{2})$/;
  const match = regex.exec(time);

  if (!match) {
    throw new Error(`Invalid time format (expected hh:mm:ss): ${time}`);
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const [_, hh, mm, ss] = match;

  validateTime(Number(hh), Number(mm), Number(ss));

  return `${hh}:${mm}`;
}

/**
 * Convierte un string en formato hh:mm a hh:mm:ss
 * @throws Error si el formato no es válido
 */
export function TableRecordTimeToStrapiTime(time: string): string {
  const regex = /^(\d{2}):(\d{2})$/;
  const match = regex.exec(time);

  if (!match) {
    throw new Error(`Invalid time format (expected hh:mm): ${time}`);
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const [_, hh, mm] = match;

  validateTime(Number(hh), Number(mm));

  return `${hh}:${mm}:00`;
}

/**
 * Valida rangos de hora, minuto y segundo
 */
function validateTime(hh: number, mm: number, ss: number = 0): void {
  if (hh < 0 || hh > 23) {
    throw new Error(`Invalid hour value: ${hh}`);
  }
  if (mm < 0 || mm > 59) {
    throw new Error(`Invalid minutes value: ${mm}`);
  }
  if (ss < 0 || ss > 59) {
    throw new Error(`Invalid seconds value: ${ss}`);
  }
}

export function formatBytesToMB(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

export const StrapiBlocksContentToTiptapJSONContent = (
  content: BlocksContent,
): JSONContent => {
  type StrapiNode = {
    type?: string;
    text?: string;
    children?: StrapiNode[];
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    url?: string;
    openInNewTab?: boolean;
    level?: number;
    format?: "ordered" | "unordered";
    start?: number;
  };

  type TiptapMark = NonNullable<JSONContent["marks"]>[number];

  // Transforms leaf nodes from Strapi into Tiptap text nodes with the proper marks
  const convertInlineNodes = (
    nodes: StrapiNode[] | undefined,
    inheritedMarks: TiptapMark[] = [],
  ): JSONContent[] => {
    if (!nodes?.length) {
      return [];
    }

    return nodes.flatMap((node) => {
      if (!node) {
        return [];
      }

      if (node.type === "link") {
        const attrs: Record<string, unknown> = { href: node.url ?? "" };

        if (node.openInNewTab) {
          attrs.target = "_blank";
          attrs.rel = "noopener noreferrer";
        }

        const linkMark: TiptapMark = { type: "link", attrs };

        return convertInlineNodes(node.children, [...inheritedMarks, linkMark]);
      }

      if (node.text !== undefined) {
        const marks: TiptapMark[] = [...inheritedMarks];

        if (node.bold) {
          marks.push({ type: "bold" });
        }

        if (node.italic) {
          marks.push({ type: "italic" });
        }

        if (node.underline) {
          marks.push({ type: "underline" });
        }

        // Ignore empty text nodes unless they carry formatting marks
        if (!node.text.length && !marks.length) {
          return [];
        }

        const textNode: JSONContent = { type: "text", text: node.text };

        if (marks.length) {
          textNode.marks = marks;
        }

        return [textNode];
      }

      if (node.children?.length) {
        return convertInlineNodes(node.children, inheritedMarks);
      }

      return [];
    });
  };

  // Maps block level nodes (paragraphs, headings, lists) to their Tiptap counterparts
  const convertBlockNode = (node: StrapiNode): JSONContent | null => {
    if (!node) {
      return null;
    }

    switch (node.type) {
      case "paragraph": {
        const paragraph: JSONContent = { type: "paragraph" };
        const inlineContent = convertInlineNodes(node.children);

        if (inlineContent.length) {
          paragraph.content = inlineContent;
        }

        return paragraph;
      }
      case "heading": {
        const heading: JSONContent = {
          type: "heading",
          attrs: { level: node.level ?? 1 },
        };
        const inlineContent = convertInlineNodes(node.children);

        if (inlineContent.length) {
          heading.content = inlineContent;
        }

        return heading;
      }
      case "list": {
        const listType = node.format === "ordered" ? "orderedList" : "bulletList";
        const listNode: JSONContent = { type: listType };
        const listItems = (node.children ?? [])
          .map((child) => convertBlockNode(child))
          .filter((child): child is JSONContent => Boolean(child));

        if (node.format === "ordered" && typeof node.start === "number") {
          listNode.attrs = { start: node.start };
        }

        if (listItems.length) {
          listNode.content = listItems;
        }

        return listNode;
      }
      case "list-item": {
        const listItemChildren = (node.children ?? [])
          .map((child) => convertBlockNode(child))
          .filter((child): child is JSONContent => Boolean(child));

        const listItem: JSONContent = { type: "listItem" };

        listItem.content = listItemChildren.length
          ? listItemChildren
          : [{ type: "paragraph" }];

        return listItem;
      }
      default: {
        if (node.text !== undefined) {
          return {
            type: "paragraph",
            content: convertInlineNodes([node]),
          };
        }

        if (node.children?.length) {
          return {
            type: "paragraph",
            content: convertInlineNodes(node.children),
          };
        }

        return null;
      }
    }
  };

  // Assemble the final Tiptap document, defaulting to an empty paragraph when needed
  const documentContent = (content ?? [])
    .map((block) => convertBlockNode(block as StrapiNode))
    .filter((node): node is JSONContent => Boolean(node));

  if (!documentContent.length) {
    documentContent.push({ type: "paragraph" });
  }

  return {
    type: "doc",
    content: documentContent,
  };
};
