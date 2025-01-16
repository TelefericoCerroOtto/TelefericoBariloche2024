"use client";

import { VariantProps } from "class-variance-authority";
import Link, { LinkProps } from "next/link";
import { type ReactNode } from "react";
import { buttonStyles } from "./ButtonDos";

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
