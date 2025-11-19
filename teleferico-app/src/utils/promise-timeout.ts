export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10_000,
  label: string = "Promise timed out",
) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
