import { type BlocksContent } from "@strapi/blocks-react-renderer";

// Converts a Strapi rich text payload into a plain string so it can be reused as
// compact excerpts without shipping the full rich text renderer to the client.
export function blocksToPlainText(
  content: BlocksContent | null | undefined,
): string {
  if (!content) return "";

  const queue: unknown[] = Array.isArray(content) ? [...content] : [content];
  const collectedText: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift();

    if (!node || typeof node !== "object") continue;

    if (
      "text" in node &&
      typeof (node as { text?: unknown }).text === "string"
    ) {
      collectedText.push((node as { text: string }).text);
    }

    if (
      "children" in node &&
      Array.isArray((node as { children?: unknown }).children)
    ) {
      queue.push(...((node as { children: unknown[] }).children));
    }

    if ("content" in node && Array.isArray((node as { content?: unknown }).content)) {
      queue.push(...((node as { content: unknown[] }).content));
    }
  }

  return collectedText.join(" ").replace(/\s+/g, " ").trim();
}

export function blocksToExcerpt(
  content: BlocksContent | null | undefined,
  options: { maxLength?: number; suffix?: string } = {},
): string {
  const { maxLength = 200, suffix = "…" } = options;
  const plainText = blocksToPlainText(content);

  if (plainText.length <= maxLength) return plainText;

  return `${plainText.slice(0, maxLength).trimEnd()}${suffix}`;
}
