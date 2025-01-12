"use client";

import { buttonStyles } from "@/utils/styles";
import { cn } from "@/utils/tw-merge";
import { Spinner } from "@nextui-org/react";
import { type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes } from "react";

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
