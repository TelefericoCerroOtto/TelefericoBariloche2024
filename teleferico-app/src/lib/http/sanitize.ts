export function sanitizeInput(value: string) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .trim();
}
