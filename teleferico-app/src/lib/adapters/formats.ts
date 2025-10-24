import type { StrapiBlocksPayload, TimeValue } from "@/types";
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
        const listType =
          node.format === "ordered" ? "orderedList" : "bulletList";
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

export const TiptapJSONContentToStrapiBlocksContent = (
  content: JSONContent,
): StrapiBlocksPayload => {
  type StrapiTextNode = {
    type: "text";
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };

  type StrapiLinkNode = {
    type: "link";
    url: string;
    openInNewTab?: boolean;
    children: StrapiTextNode[];
  };

  type StrapiInlineNode = StrapiTextNode | StrapiLinkNode;

  type StrapiParagraphNode = {
    type: "paragraph";
    children: StrapiInlineNode[];
  };

  type StrapiHeadingNode = {
    type: "heading";
    level: 1 | 2 | 3 | 4 | 5 | 6;
    children: StrapiInlineNode[];
  };

  type StrapiListItemNode = {
    type: "list-item";
    children: StrapiParagraphNode[];
  };

  type StrapiListNode = {
    type: "list";
    format: "ordered" | "unordered";
    start?: number;
    children: StrapiListItemNode[];
  };

  type StrapiBlockNode =
    | StrapiParagraphNode
    | StrapiHeadingNode
    | StrapiListNode
    | StrapiListItemNode;

  type TiptapMark = NonNullable<JSONContent["marks"]>[number];

  const createTextNode = (
    text: string,
    marks: TiptapMark[] = [],
  ): { node: StrapiTextNode | null; link: TiptapMark | null } => {
    const textNode: StrapiTextNode = { type: "text", text };
    let linkMark: TiptapMark | null = null;

    // Map Tiptap marks into Strapi boolean flags
    for (const mark of marks) {
      switch (mark.type) {
        case "bold":
          textNode.bold = true;
          break;
        case "italic":
          textNode.italic = true;
          break;
        case "underline":
          textNode.underline = true;
          break;
        case "link":
          linkMark = mark;
          break;
        default:
          break;
      }
    }

    if (!text.length && !textNode.bold && !textNode.italic && !textNode.underline) {
      return { node: null, link: linkMark };
    }

    return { node: textNode, link: linkMark };
  };

  const convertInlineNodes = (
    nodes: JSONContent[] | undefined,
  ): StrapiInlineNode[] => {
    if (!nodes?.length) {
      return [];
    }

    return nodes.flatMap((node) => {
      if (!node) {
        return [];
      }

      if (node.type === "text") {
        const marks = node.marks ?? [];
        const { node: textNode, link } = createTextNode(node.text ?? "", marks);

        if (!textNode) {
          return [];
        }

        if (link) {
          const attrs = (link.attrs ?? {}) as Record<string, unknown>;
          const url = String(attrs.href ?? "");
          const openInNewTab = attrs.target === "_blank" ? true : undefined;

          const linkNode: StrapiLinkNode = {
            type: "link",
            url,
            children: [textNode],
          };

          if (openInNewTab) {
            linkNode.openInNewTab = true;
          }

          return [linkNode];
        }

        return [textNode];
      }

      if (node.type === "hardBreak") {
        const { node: textNode } = createTextNode("\n", []);
        return textNode ? [textNode] : [];
      }

      // For any other inline node we try to reuse its children as inline content
      return convertInlineNodes(node.content);
    });
  };

  const ensureParagraphChildren = (
    inlineNodes: StrapiInlineNode[],
  ): StrapiInlineNode[] => {
    if (inlineNodes.length) {
      return inlineNodes;
    }

    return [{ type: "text", text: "" }];
  };

  const convertParagraphNode = (
    node: JSONContent | undefined,
  ): StrapiParagraphNode => {
    const inlineNodes = node?.type === "paragraph"
      ? convertInlineNodes(node.content)
      : convertInlineNodes(node?.content ?? (node ? [node] : undefined));

    return {
      type: "paragraph",
      children: ensureParagraphChildren(inlineNodes),
    };
  };

  const convertHeadingNode = (node: JSONContent): StrapiHeadingNode => {
    const rawLevel = Number(node.attrs?.level ?? 1);
    const normalizedLevel = Math.min(6, Math.max(1, rawLevel)) as
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6;

    return {
      type: "heading",
      level: normalizedLevel,
      children: ensureParagraphChildren(convertInlineNodes(node.content)),
    };
  };

  const convertListItemNode = (node: JSONContent): StrapiListItemNode => {
    const paragraphs = (node.content ?? [])
      .map((child) => convertParagraphNode(child))
      .filter((child) => Boolean(child));

    return {
      type: "list-item",
      children: paragraphs.length ? paragraphs : [convertParagraphNode(undefined)],
    };
  };

  const convertListNode = (node: JSONContent): StrapiListNode => {
    const format = node.type === "orderedList" ? "ordered" : "unordered";

    const children = (node.content ?? [])
      .map((child) =>
        child.type === "listItem"
          ? convertListItemNode(child)
          : convertListItemNode({ type: "listItem", content: [child] }),
      )
      .filter((child) => Boolean(child));

    const listNode: StrapiListNode = {
      type: "list",
      format,
      children,
    };

    if (format === "ordered") {
      const start = node.attrs?.start;
      if (typeof start === "number" && start !== 1) {
        listNode.start = start;
      }
    }

    return listNode;
  };

  const convertBlockNode = (node: JSONContent): StrapiBlockNode => {
    switch (node.type) {
      case "paragraph":
        return convertParagraphNode(node);
      case "heading":
        return convertHeadingNode(node);
      case "orderedList":
      case "bulletList":
        return convertListNode(node);
      case "listItem":
        return convertListItemNode(node);
      default:
        // Fallback to paragraph to keep unexpected nodes renderable in Strapi
        return convertParagraphNode(node);
    }
  };

  const documentChildren = content?.type === "doc" ? content.content ?? [] : [content];

  const blocks = documentChildren
    .map((node) => (node ? convertBlockNode(node) : null))
    .filter((node): node is StrapiBlockNode => Boolean(node));

  return blocks as StrapiBlocksPayload;
};
