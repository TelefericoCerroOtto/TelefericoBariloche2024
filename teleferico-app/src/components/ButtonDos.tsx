"use client";

import { cn } from "@/utils/tw-merge";
import { Spinner } from "@nextui-org/react";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes } from "react";

interface Props
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  isLoading?: boolean;
}

export const buttonStyles = cva(
  "active:scale-95 inline-flex items-center font-bold outline-none min-w-[70px] justify-center rounded-full transition-colors disabled:pointer-events-none",
  {
    variants: {
      // TODO: cambiar los "primary" por "custom-"
      intent: {
        solid: "bg-primary hover:bg-primary/90 text-white",
        ghost: "hover:bg-primary/20 text-primary",
        ghostBlack: "hover:bg-foreground/20 text-foreground",
        outlineRed:
          "bg-transparent hover:bg-primary/20 border-1 border-primary text-primary",
        outlineWhite: "bg-transparent hover:bg-white/20 border-white ",
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

export default function ButtonDos(props: Props) {
  const {
    children,
    intent,
    size,
    fullWidth,
    className,
    isLoading = false,
    ...buttonProps
  } = props;

  return (
    <button
      className={cn(buttonStyles({ intent, size, fullWidth, className }))}
      {...buttonProps}
    >
      {isLoading ? <Spinner size="sm" color="white" /> : children}
    </button>
  );
}
