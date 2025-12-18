export const selectInputStyles = {
  variant: "flat" as const,
  radius: "full" as const,
  className: "rounded-full",
  classNames: {
    trigger: "bg-accent hover:bg-accent border border-custom-border",
  },
  labelPlacement: "outside" as const,
  placeholder: "Seleccionar",
};

export const tableStyles = {
  removeWrapper: true,
  "aria-label": "Example empty table",
  classNames: {
    thead: "border-b border-b-custom-border ",
    table: "bg-white",
    th: "bg-white text-base font-bold text-black",
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
