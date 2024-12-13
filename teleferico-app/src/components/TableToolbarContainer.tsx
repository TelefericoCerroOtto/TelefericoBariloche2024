import Link from "next/link";
import { type ReactNode } from "react";
import { buttonStyles } from "./ButtonDos";

interface Props {
  children: ReactNode;
  linkTitle: string;
  linkHref: string;
}

export default function TableToolbarContainer(props: Props) {
  const { children, linkTitle, linkHref } = props;

  return (
    <div className="py-auto flex h-12 w-full items-center justify-between gap-8 overflow-scroll border-b border-b-foreground-300 bg-white px-3">
      <div className="flex gap-6">{children}</div>
      <Link
        href={linkHref}
        className={buttonStyles({ className: "min-w-[80px]", intent: "solid" })}
      >
        {linkTitle}
      </Link>
    </div>
  );
}
