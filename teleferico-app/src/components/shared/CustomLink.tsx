"use client";

import { buttonStyles } from "@/components/shared/ButtonDos";
import { useLocale } from "@/hooks";
import { VariantProps } from "class-variance-authority";
import Link, { LinkProps } from "next/link";
import { type ReactNode } from "react";
import clsx from "clsx";

interface Props extends VariantProps<typeof buttonStyles>, LinkProps {
  children: ReactNode;
  withButtonStyles?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function CustomLink(props: Props) {
  const {
    href,
    children,
    withButtonStyles = false,
    intent,
    size,
    fullWidth,
    className,
    disabled = false,
    ...rest
  } = props;

  const { locale } = useLocale();

  const baseClassName = withButtonStyles
    ? buttonStyles({ intent, size, fullWidth, className })
    : className;

  const finalClassName = clsx(
    baseClassName,
    disabled && "pointer-events-none opacity-60 cursor-not-allowed",
  );

  if (disabled) {
    return (
      <span aria-disabled="true" tabIndex={-1} className={finalClassName}>
        {children}
      </span>
    );
  }

  return (
    <Link href={`/${locale}${href}`} className={finalClassName} {...rest}>
      {children}
    </Link>
  );
}
