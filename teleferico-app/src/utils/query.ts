import { stringify } from "qs";

export const stringifyQuery = (query: unknown) => {
  return stringify(query, { encode: false });
};
