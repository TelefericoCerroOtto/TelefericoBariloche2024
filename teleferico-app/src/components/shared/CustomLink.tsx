"use client";

import { buttonStyles } from "@/components/shared/ButtonDos";
import { useLocale } from "@/hooks";
import {
  isExternalHref,
  isHttpUrl,
  withLocalePrefix,
} from "@/lib/helpers/links";
import { VariantProps } from "class-variance-authority";
import clsx from "clsx";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import NextLink from "next/link";
import type { ComponentProps, ReactNode } from "react";

type NextLinkComponentProps = ComponentProps<typeof NextLink>;

interface Props
  extends VariantProps<typeof buttonStyles>,
    Omit<NextLinkComponentProps, "href" | "children"> {
  href: NextLinkComponentProps["href"];
  children: ReactNode;
  withButtonStyles?: boolean;
  className?: string;
  disabled?: boolean;
  showExternalIcon?: boolean;
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
    showExternalIcon = true,
    target,
    rel,
    prefetch,
    ...rest
  } = props;

  const { locale } = useLocale();

  const baseClassName = withButtonStyles
    ? buttonStyles({ intent, size, fullWidth, className })
    : className;

  const finalClassName = clsx(
    baseClassName,
    withButtonStyles && "inline-flex items-center gap-2",
    disabled && "pointer-events-none opacity-60 cursor-not-allowed",
  );

  if (disabled) {
    return (
      <span aria-disabled="true" tabIndex={-1} className={finalClassName}>
        {children}
      </span>
    );
  }

  const hrefString = typeof href === "string" ? href : null;

  const external = hrefString ? isExternalHref(hrefString) : false;
  const opensNewTab = hrefString ? isHttpUrl(hrefString) : false;

  const finalHref =
    hrefString && !external ? withLocalePrefix(hrefString, locale) : href;

  return (
    <NextLink
      href={finalHref}
      className={finalClassName}
      {...rest}
      target={opensNewTab ? "_blank" : target}
      rel={opensNewTab ? "noopener noreferrer" : rel}
      prefetch={opensNewTab ? false : prefetch}
    >
      {showExternalIcon && opensNewTab ? (
        <>
          <span>{children}</span>
          <ExternalLinkIcon aria-hidden className="h-4 w-4" />
          <span className="sr-only">(opens in a new tab)</span>
        </>
      ) : (
        children
      )}
    </NextLink>
  );
}
