// teleferico-app/src/components/shared/Tooltip.tsx
"use client";

import * as React from "react";
import {
  Popover as HeroPopover,
  PopoverTrigger,
  PopoverContent,
  Tooltip as HeroTooltip, // solo para tipar props (si querés mantener la firma)
} from "@heroui/react";
import type { ComponentProps } from "react";

type TooltipProps = ComponentProps<typeof HeroTooltip>;

export default function Popover(props: TooltipProps) {
  const {
    children,
    content,
    isDisabled,
    placement = "top-start",
    offset = 7,
  } = props;

  if (isDisabled || !content) return <>{children}</>;

  return (
    <HeroPopover
      placement={placement as ComponentProps<typeof HeroPopover>["placement"]}
      offset={offset as ComponentProps<typeof HeroPopover>["offset"]}
      shouldCloseOnScroll={false} // evita cierres raros en contenedores con overflow :contentReference[oaicite:1]{index=1}
      triggerScaleOnOpen={false} // evita “saltitos” en texto inline
    >
      <PopoverTrigger>
        <button
          type="button"
          className="font-inherit m-0 inline-flex border-0 bg-transparent p-0 text-left text-inherit leading-inherit"
          onClick={(e) => e.stopPropagation()} // por si la fila tiene handlers/selección
        >
          {children}
        </button>
      </PopoverTrigger>

      <PopoverContent>
        <div className="max-w-md p-2 text-xl leading-snug">{content}</div>
      </PopoverContent>
    </HeroPopover>
  );
}
