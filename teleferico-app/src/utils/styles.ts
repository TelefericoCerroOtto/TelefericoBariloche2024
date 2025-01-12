import { cva } from "class-variance-authority";

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

export const buttonStyles = cva(
  "active:scale-95 inline-flex items-center text-center font-bold outline-none min-w-[70px] justify-center rounded-full transition-colors disabled:pointer-events-none",
  {
    variants: {
      // TODO: cambiar los "primary" por "custom-"
      intent: {
        solid: "bg-primary hover:bg-primary/90 text-white",
        ghost: "hover:bg-primary/20 text-primary",
        ghostBlack: "hover:bg-foreground/20 text-foreground",
        ghostWhite: "hover:bg-white/20 text-white",
        outlineRed:
          "bg-transparent hover:bg-primary/20 border-1 border-primary text-primary",
        outlineWhite: "bg-transparent hover:bg-white/20 border border-white ",
        disable: "bg-custom-gray text-white cursor-default active:scale-100",
      },
      size: {
        default: "h-9 px-2 text-xs sm:h-10 sm:py-2 sm:px-4 sm:text-sm",
        sm: "h-9 px-2 text-xs",
        lg: "h-11 px-8 text-base",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      intent: "solid",
      size: "default",
    },
  },
);
