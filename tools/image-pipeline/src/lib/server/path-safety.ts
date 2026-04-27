const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const PATH_SEPARATOR_PATTERN = /[\\/]/;
const SAFE_REGISTRY_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

function requireCanonicalString(value: unknown, context: string) {
  if (typeof value !== "string") {
    throw new Error(`${context} must be a non-empty string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${context} must be a non-empty string`);
  }

  if (trimmed !== value) {
    throw new Error(`${context} must not include leading or trailing whitespace`);
  }

  return trimmed;
}

export function requireSafePathAtom(value: unknown, context: string) {
  const canonical = requireCanonicalString(value, context);

  if (PATH_SEPARATOR_PATTERN.test(canonical)) {
    throw new Error(`${context} contains unsafe path separators`);
  }

  if (canonical === "." || canonical === "..") {
    throw new Error(`${context} contains an unsafe traversal segment`);
  }

  if (CONTROL_CHARACTER_PATTERN.test(canonical)) {
    throw new Error(`${context} contains unsafe control characters`);
  }

  return canonical;
}

export function requireSafeRegistryId(value: unknown, context: string) {
  const canonical = requireSafePathAtom(value, context);

  if (!SAFE_REGISTRY_ID_PATTERN.test(canonical)) {
    throw new Error(
      `${context} must be a safe slug and cannot contain unsafe path forms`,
    );
  }

  return canonical;
}
