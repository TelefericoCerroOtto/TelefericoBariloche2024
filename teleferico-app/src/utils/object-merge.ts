export function deepMerge<T>(target: T, source?: Partial<T>): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = Array.isArray(target) ? [...target] : { ...target };

  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }

  return result;
}
