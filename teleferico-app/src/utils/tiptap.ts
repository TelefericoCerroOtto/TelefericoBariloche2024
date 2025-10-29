// Tipos en runtime: no hace falta importar JSONContent para validar.
type TTNode = {
  type?: string;
  text?: string;
  content?: TTNode[];
  attrs?: Record<string, unknown>;
};

// Ajustá esta lista si usás extensiones custom que cuenten como “contenido”.
const NON_TEXTUAL_NODES = new Set([
  "image",
  "iframe",
  "youtube",
  "video",
  "audio",
  "embed",
  "horizontalRule",
]);

export function getPlainTextLen(node?: TTNode): number {
  if (!node) return 0;

  if (node.type === "text") {
    return (node.text ?? "").replace(/\s+/g, "").length; // sin espacios
  }

  if (Array.isArray(node.content)) {
    return node.content.reduce((acc, child) => acc + getPlainTextLen(child), 0);
  }

  return 0;
}

export function hasNonTextualContent(node?: TTNode): boolean {
  if (!node) return false;

  if (node.type && NON_TEXTUAL_NODES.has(node.type)) return true;

  if (Array.isArray(node.content)) {
    return node.content.some(hasNonTextualContent);
  }

  return false;
}

export function isValidTiptapDoc(doc: unknown): doc is TTNode {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as TTNode;
  return d.type === "doc" && Array.isArray(d.content);
}

export function isTiptapNonEmpty(doc: TTNode): boolean {
  const textLen = getPlainTextLen(doc);
  return textLen > 0 || hasNonTextualContent(doc);
}

export function createEmptyJSONContent() {
  return {
    type: undefined,
    attrs: undefined,
    content: undefined,
    marks: undefined,
    text: undefined,
  };
}
