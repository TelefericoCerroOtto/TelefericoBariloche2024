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
};

export const formInputClassNames = {
  label: "text-lg font-semibold",
  input: "text-base",
  innerWrapper: "text-base",
  helperWrapper: "text-base",
  description: "text-base",
  errorMessage: "text-base",
};

export const formSelectClassNames = {
  label: "text-lg font-semibold",
  trigger: "text-base",
  value: "text-base",
  helperWrapper: "text-base",
  description: "text-base",
  errorMessage: "text-base",
  listbox: "text-base",
  popoverContent: "text-base",
};

export const formCheckboxClassNames = {
  label: "text-base",
};

export const formTimeInputClassNames = {
  label: "text-lg font-semibold",
  input: "text-base",
  innerWrapper: "text-base",
  helperWrapper: "text-base",
  description: "text-base",
  errorMessage: "text-base",
};

export const tableStyles = {
  removeWrapper: true,
  "aria-label": "Example empty table",
  classNames: {
    thead: "border-b border-b-custom-border ",
    table: "bg-white",
    th: "bg-white font-bold text-black",
  },
};

export const bgStyles = {
  none: "",
  gray: "bg-gray-200",
};

export const caseStyles = {
  normal: "normal-case",
  uppercase: "uppercase",
  lowercase: "lowercase",
  capitalize: "capitalize",
};
