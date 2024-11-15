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
      intent: {
        solid: "bg-primary hover:bg-primary/90 text-white",
        ghost: "hover:bg-primary/20 text-primary",
        outlineRed:
          "bg-transparent hover:bg-primary/20 border-2 border-primary text-primary",
        outlineWhite: "bg-transparent hover:bg-white/20 border-white ",
        disable: "bg-primary-foreground text-white cursor-default",
      },
      size: {
        default: "h-10 py-2 px-4 text-sm",
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
      disabled={isLoading}
    >
      {isLoading ? <Spinner size="sm" color="white" /> : children}
    </button>
  );
}
