import Link from "next/link";
import { type ReactNode } from "react";
import { buttonStyles } from "./ButtonDos";

interface Props {
  children: ReactNode;
  title: string;
  linkHref: string;
}

export default function TableToolbarContainer(props: Props) {
  const { children, title, linkHref } = props;

  return (
    <div className="py-auto flex h-20 w-full items-center justify-between gap-8 overflow-scroll border-b border-b-foreground-300 bg-white px-3">
      <div className="flex min-w-[600px] flex-1 items-center gap-6">
        {children}
      </div>
      <Link
        href={linkHref}
        className={buttonStyles({
          className: "min-w-[80px]",
          intent: "solid",
        })}
      >
        {title}
      </Link>
    </div>
  );
}
