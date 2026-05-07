// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
export const cleanObject = <T extends {}>(user: T) => {
  return Object.fromEntries(
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    Object.entries(user).filter(([_, value]) => Boolean(value)),
  );
};

export const filterDifferences = (
  objA: { [key: string]: unknown },
  objB: { [key: string]: unknown },
) => {
  return Object.fromEntries(
    Object.entries(objB).filter(([key, value]) => objA[key] !== value),
  );
};
