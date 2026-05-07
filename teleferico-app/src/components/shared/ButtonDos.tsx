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
        default: "h-12 px-4",
        sm: "h-9 px-2",
        lg: "h-12 px-8",
      },
      fontSize: {
        base: "text-base",
        sm: "text-sm",
        lg: "text-lg",
        default: "text-base sm:text-xl",
        "2xl": "text-2xl",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      intent: "solid",
      size: "default",
      fontSize: "default",
    },
  },
);

interface Props
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
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
    onClick,
    ...buttonProps
  } = props;

  const isDisabled = disabled || isLoading;

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
      disabled={isDisabled}
      aria-disabled={isDisabled}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick?.(e);
      }}
      {...buttonProps}
    >
      {isLoading ? <Spinner size="sm" color="white" /> : children}
    </button>
  );
}
