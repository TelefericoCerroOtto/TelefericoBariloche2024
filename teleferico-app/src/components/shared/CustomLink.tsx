"use client";

import { buttonStyles } from "@/components/shared/ButtonDos";
import { useLocale } from "@/hooks";
import { i18n } from "@/i18n";
import { VariantProps } from "class-variance-authority";
import Link, { LinkProps } from "next/link";
import { type ReactNode } from "react";

interface Props extends VariantProps<typeof buttonStyles>, LinkProps {
  children: ReactNode;
  withButtonStyles?: boolean;
  className?: string;
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
  } = props;
  const { locale } = useLocale();
  return (
    <Link
      href={`${locale === i18n.defaultLocale ? "" : `/${locale}`}${href}`}
      className={
        withButtonStyles
          ? buttonStyles({ intent, size, fullWidth, className })
          : className
      }
    >
      {children}
    </Link>
  );
}
