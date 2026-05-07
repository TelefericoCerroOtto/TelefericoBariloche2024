export function ratioToTag(ratio: string | number): string {
  const s = String(ratio).trim().toLowerCase();

  // "21:9" o "21/9" => "21x9"
  if (s.includes(":") || s.includes("/")) {
    return s.replaceAll(" ", "").replaceAll("/", "x").replaceAll(":", "x");
  }

  // float => "r1_777"
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) {
    return `r${s.replaceAll(".", "_")}`;
  }

  // fallback
  return s.replaceAll(" ", "");
}
