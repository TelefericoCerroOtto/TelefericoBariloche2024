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
    th: "bg-white font-bold text-black",
  },
};

export const titleStyles = {
  className: "text-3xl font-bold capitalize text-inherit md:text-5xl",
};
