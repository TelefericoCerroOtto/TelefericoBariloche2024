import sharp from "sharp";

export function orientedSize(meta: sharp.Metadata): { w: number; h: number } {
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("Could not read image dimensions.");

  // Orientations 5-8 intercambian ancho/alto (rotaciones 90/270)
  const o = meta.orientation ?? 1;
  const swaps = o >= 5 && o <= 8;

  return swaps ? { w: h, h: w } : { w, h };
}
