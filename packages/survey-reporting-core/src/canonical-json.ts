export type CanonicalJson =
  | null
  | boolean
  | string
  | number
  | readonly CanonicalJson[]
  | { readonly [key: string]: CanonicalJson };

function assertUnicodeScalarString(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError("Unpaired high surrogate");
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new TypeError("Unpaired low surrogate");
    }
  }
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) return leftPoints[index]! - rightPoints[index]!;
  }
  return leftPoints.length - rightPoints.length;
}

export function canonicalizeJson(value: unknown): string {
  const ancestors = new Set<object>();
  const encode = (candidate: unknown): string => {
    if (candidate === null || typeof candidate === "boolean") return String(candidate);
    if (typeof candidate === "string") {
      assertUnicodeScalarString(candidate);
      return JSON.stringify(candidate);
    }
    if (typeof candidate === "number") {
      if (!Number.isSafeInteger(candidate)) throw new TypeError("Expected a safe integer");
      return String(candidate);
    }
    if (typeof candidate !== "object") throw new TypeError("Unsupported canonical JSON value");
    if (ancestors.has(candidate)) throw new TypeError("Canonical JSON cannot contain cycles");

    ancestors.add(candidate);
    try {
      if (Array.isArray(candidate)) return `[${candidate.map(encode).join(",")}]`;
      const prototype = Object.getPrototypeOf(candidate);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError("Expected a plain object");
      }
      const entries = Object.keys(candidate)
        .sort(compareCodePoints)
        .map((key) => {
          assertUnicodeScalarString(key);
          return `${JSON.stringify(key)}:${encode((candidate as Record<string, unknown>)[key])}`;
        });
      return `{${entries.join(",")}}`;
    } finally {
      ancestors.delete(candidate);
    }
  };
  return encode(value);
}
