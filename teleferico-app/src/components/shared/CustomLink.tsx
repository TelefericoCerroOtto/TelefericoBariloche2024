"use client";

import { buttonStyles } from "@/components/shared/ButtonDos";
import { VariantProps } from "class-variance-authority";
import Link, { LinkProps } from "next/link";
import { type ReactNode } from "react";

interface Props extends VariantProps<typeof buttonStyles>, LinkProps {
  children: ReactNode;
  className?: string;
}

export default function CustomLink(props: Props) {
  const { href, children, intent, size, fullWidth, className } = props;
  return (
    <Link
      href={href}
      className={buttonStyles({ intent, size, fullWidth, className })}
    >
      {children}
    </Link>
  );
}
