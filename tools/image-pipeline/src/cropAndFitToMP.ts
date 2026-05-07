export type AspectRatioInput = string | number;

export type Resolution = { w: number; h: number };

export type FocalPoint = {
  /** Normalizado 0..1 (0=izq/arriba, 1=der/abajo). */
  x: number;
  y: number;
};

export type CropRect = { x: number; y: number; w: number; h: number };

export type CropFitOpts = {
  /** Si true, la salida no supera el crop base. Default: true */
  capToBase?: boolean;
  /** Alinea W/H a múltiplos (2 suele ser buen default para imágenes). Default: 1 */
  alignTo?: number;
};

export type CropFitResult = {
  ratio: { r: number; a?: number; b?: number; exact: boolean };
  base: Resolution;
  crop: CropRect;
  out: Resolution;
  mpTarget: number;
  mpOut: number;
};

/**
 * CROP (con focalPoint o center) + RESIZE para lograr:
 * - Ratio pedido (exacto si ratio "a:b")
 * - MP lo más cercano posible SIN exceder mpTarget
 * - (opcional) sin superar el crop base (capToBase)
 *
 * focalPoint: {x,y} normalizados 0..1. Si no se pasa => center (0.5,0.5).
 */
export function cropAndFitToMP(
  aspectRatio: AspectRatioInput,
  mpTarget: number,
  base: Resolution,
  focalPoint?: FocalPoint,
  opts: CropFitOpts = {},
): CropFitResult {
  const capToBase = opts.capToBase ?? true;
  const alignTo = Math.max(1, opts.alignTo ?? 1);

  const safeBase = {
    w: Math.max(0, Math.floor(base.w)),
    h: Math.max(0, Math.floor(base.h)),
  };
  const mp = Number.isFinite(mpTarget) ? mpTarget : 0;
  if (safeBase.w <= 0 || safeBase.h <= 0 || mp <= 0) {
    return {
      ratio: { r: NaN, exact: false },
      base: safeBase,
      crop: { x: 0, y: 0, w: 0, h: 0 },
      out: { w: 0, h: 0 },
      mpTarget: mpTarget,
      mpOut: 0,
    };
  }

  const parsed = parseAspectRatio(aspectRatio);
  if (!(parsed.r > 0)) {
    return {
      ratio: parsed,
      base: safeBase,
      crop: { x: 0, y: 0, w: 0, h: 0 },
      out: { w: 0, h: 0 },
      mpTarget: mpTarget,
      mpOut: 0,
    };
  }

  // -------------------------
  // 1) CROP máximo al ratio
  // -------------------------
  const baseR = safeBase.w / safeBase.h;
  let cropW: number;
  let cropH: number;

  if (baseR > parsed.r) {
    // base demasiado ancha => recortar ancho
    cropH = safeBase.h;
    cropW = Math.floor(cropH * parsed.r);
  } else {
    // base demasiado alta => recortar alto
    cropW = safeBase.w;
    cropH = Math.floor(cropW / parsed.r);
  }

  cropW = Math.max(1, Math.min(cropW, safeBase.w));
  cropH = Math.max(1, Math.min(cropH, safeBase.h));

  // focalPoint normalizado (default center)
  const fxN = clamp01(focalPoint?.x ?? 0.5);
  const fyN = clamp01(focalPoint?.y ?? 0.5);

  const fx = fxN * safeBase.w;
  const fy = fyN * safeBase.h;

  // Ubicamos el crop centrado en el focal point, clamped a bordes
  const cropX = clampInt(Math.floor(fx - cropW / 2), 0, safeBase.w - cropW);
  const cropY = clampInt(Math.floor(fy - cropH / 2), 0, safeBase.h - cropH);

  const crop: CropRect = { x: cropX, y: cropY, w: cropW, h: cropH };

  // -------------------------
  // 2) RESIZE a MP objetivo
  // -------------------------
  const targetPixels = Math.floor(mp * 1_000_000);
  const maxW = capToBase ? crop.w : Number.POSITIVE_INFINITY;
  const maxH = capToBase ? crop.h : Number.POSITIVE_INFINITY;

  const out = parsed.exact
    ? fitExactRatioToMP(parsed.a!, parsed.b!, targetPixels, maxW, maxH, alignTo)
    : fitFloatRatioToMP(parsed.r, targetPixels, maxW, maxH, alignTo);

  const mpOut = out.w > 0 && out.h > 0 ? (out.w * out.h) / 1_000_000 : 0;

  return {
    ratio: parsed,
    base: safeBase,
    crop,
    out,
    mpTarget: mpTarget,
    mpOut,
  };
}

/* ---------------- Helpers ---------------- */

function parseAspectRatio(input: AspectRatioInput): {
  r: number;
  a?: number;
  b?: number;
  exact: boolean;
} {
  if (typeof input === "number") return { r: input, exact: false };

  const s = input.trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 0 && b > 0) return { r: a / b, a, b, exact: true };
    return { r: NaN, exact: false };
  }

  const n = Number(s);
  return Number.isFinite(n) ? { r: n, exact: false } : { r: NaN, exact: false };
}

// Ratio exacto: W=a*k, H=b*k
function fitExactRatioToMP(
  a: number,
  b: number,
  targetPixels: number,
  maxW: number,
  maxH: number,
  alignTo: number,
): Resolution {
  const ab = a * b;
  if (ab <= 0) return { w: 0, h: 0 };

  const kByPixels = Math.floor(Math.sqrt(targetPixels / ab));
  const kByW = Number.isFinite(maxW) ? Math.floor(maxW / a) : kByPixels;
  const kByH = Number.isFinite(maxH) ? Math.floor(maxH / b) : kByPixels;

  let kMax = Math.max(0, Math.min(kByPixels, kByW, kByH));
  if (kMax <= 0) return { w: 0, h: 0 };

  // Si piden alineación, buscamos k tal que a*k y b*k sean múltiplos de alignTo
  if (alignTo > 1) {
    const step = lcm(alignTo / gcd(alignTo, a), alignTo / gcd(alignTo, b));
    if (step <= kMax) {
      kMax = Math.floor(kMax / step) * step;
    }
    // si step > kMax, no se puede alinear manteniendo ratio exacto sin bajar a 0;
    // en ese caso ignoramos alineación (preferimos mantener ratio exacto + MP).
  }

  const w = Math.floor(a * kMax);
  const h = Math.floor(b * kMax);

  return { w, h };
}

// Ratio flotante: aproximación segura (<= MP) + alineación
function fitFloatRatioToMP(
  r: number,
  targetPixels: number,
  maxW: number,
  maxH: number,
  alignTo: number,
): Resolution {
  if (!(r > 0)) return { w: 0, h: 0 };

  let wIdeal = Math.sqrt(targetPixels * r);
  let hIdeal = Math.sqrt(targetPixels / r);

  let scale = 1;
  if (Number.isFinite(maxW)) scale = Math.min(scale, maxW / wIdeal);
  if (Number.isFinite(maxH)) scale = Math.min(scale, maxH / hIdeal);
  scale = Math.min(1, scale);

  let w = Math.floor(wIdeal * scale);
  let h = Math.floor(hIdeal * scale);

  // Re-encuadrar al ratio (mantener <= MP)
  if (r >= 1) h = Math.floor(w / r);
  else w = Math.floor(h * r);

  // Alineación
  w = floorToMultiple(w, alignTo);
  h = floorToMultiple(h, alignTo);

  // Ajuste final por constraints
  const maxW2 = Number.isFinite(maxW) ? maxW : Number.POSITIVE_INFINITY;
  const maxH2 = Number.isFinite(maxH) ? maxH : Number.POSITIVE_INFINITY;

  let guard = 10_000;
  while (guard-- > 0) {
    if (w <= 0 || h <= 0) return { w: 0, h: 0 };
    if (w <= maxW2 && h <= maxH2 && w * h <= targetPixels) break;

    if (r >= 1) {
      w = floorToMultiple(w - alignTo, alignTo);
      h = floorToMultiple(Math.floor(w / r), alignTo);
    } else {
      h = floorToMultiple(h - alignTo, alignTo);
      w = floorToMultiple(Math.floor(h * r), alignTo);
    }
  }

  return { w, h };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function floorToMultiple(n: number, m: number): number {
  const v = Math.max(0, Math.floor(n));
  if (m <= 1) return v;
  return v - (v % m);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.floor(a));
  let y = Math.abs(Math.floor(b));
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  const aa = Math.abs(Math.floor(a));
  const bb = Math.abs(Math.floor(b));
  return (aa / gcd(aa, bb)) * bb;
}
