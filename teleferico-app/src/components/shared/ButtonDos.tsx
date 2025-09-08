"use client";

import { cn } from "@/utils";
import { Spinner } from "@heroui/react";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes } from "react";

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
        default: "h-12 px-4 text-base sm:text-sm",
        sm: "h-9 px-2 text-xs",
        lg: "h-12 px-8 text-lg",
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

interface Props
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  isLoading?: boolean;
}

export default function ButtonDos(props: Props) {
  const {
    children,
    intent,
    size,
    fullWidth,
    className,
    isLoading = false,
    disabled,
    ...buttonProps
  } = props;

  return (
    <button
      className={cn(
        buttonStyles({
          intent: disabled ? "disable" : intent,
          size,
          fullWidth,
          className,
        }),
      )}
      {...buttonProps}
    >
      {isLoading ? <Spinner size="sm" color="white" /> : children}
    </button>
  );
}
