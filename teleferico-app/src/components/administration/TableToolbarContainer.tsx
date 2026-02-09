"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
  title: string;
  linkHref: string;
}

export default function TableToolbarContainer(props: Props) {
  const { children, title, linkHref } = props;

  const router = useRouter();

  return (
    <div className="py-auto flex h-20 w-full items-center justify-between gap-8 overflow-scroll border-b border-b-foreground-300 bg-white px-3">
      <div className="flex min-w-[600px] flex-1 items-center gap-6">
        {children}
      </div>
      <Button
        onPress={() => router.push(linkHref)}
        variant="solid"
        color="primary"
      >
        {title}
      </Button>
    </div>
  );
}
