import { typography } from "@/lib/constants/typography.const";

export const selectInputStyles = {
  variant: "flat" as const,
  radius: "full" as const,
  className: "rounded-full",
  classNames: {
    label: "text-lg font-semibold",
    trigger: "bg-accent hover:bg-accent border border-custom-border text-base",
    value: "text-base",
    helperWrapper: "text-base",
    description: "text-base",
    errorMessage: "text-base",
    listbox: "text-base",
  },
  labelPlacement: "outside" as const,
  placeholder: "Seleccionar",
} as const;

export const formInputClassNames = {
  label: "text-lg font-semibold",
  input: "text-base",
  innerWrapper: "text-base",
  helperWrapper: "text-base",
  description: "text-base",
  errorMessage: "text-base",
} as const;

export const formSelectClassNames = {
  label: "text-lg font-semibold",
  trigger: "text-base",
  value: "text-base",
  helperWrapper: "text-base",
  description: "text-base",
  errorMessage: "text-base",
  listbox: "text-base",
  popoverContent: "text-base",
} as const;

export const formCheckboxClassNames = {
  label: "text-base",
} as const;

export const formTimeInputClassNames = {
  label: "text-lg font-semibold",
  input: "text-base",
  innerWrapper: "text-base",
  helperWrapper: "text-base",
  description: "text-base",
  errorMessage: "text-base",
} as const;

export const tableStyles = {
  removeWrapper: true,
  "aria-label": "Example empty table",
  classNames: {
    thead: "border-b border-b-custom-border ",
    table: "bg-white",
    th: "bg-white font-bold text-black",
  },
} as const;

export const bgStyles = {
  none: "",
  gray: "bg-gray-200",
} as const;

export const caseStyles = {
  normal: "normal-case",
  uppercase: "uppercase",
  lowercase: "lowercase",
  capitalize: "capitalize",
} as const;

/**
 * @deprecated Prefer semantic tokens from `typography.const.ts` in new or migrated institutional content.
 * Keep these legacy aliases only while untouched callers move over incrementally.
 */
export const fontSize = {
  title: typography.headings.section,
  base: typography.content.section,
  epigraph: typography.meta.eyebrow,
  blockTitle: typography.headings.feature,
  blockEpigraph: typography.meta.featureEyebrow,
  blockBody: typography.content.feature,
} as const;
