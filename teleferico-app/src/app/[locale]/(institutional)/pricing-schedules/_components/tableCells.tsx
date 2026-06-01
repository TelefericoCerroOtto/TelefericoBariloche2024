import { Popover } from "@/components";
import { cn } from "@/utils";
import { truncateString } from "@/utils/truncate-string";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "brand" | "neutral" | "success" | "danger";

const pillToneStyles: Record<Tone, string> = {
  brand: "border-red-500/20 bg-red-500/10 text-red-700",
  neutral: "border-border/70 bg-default-50/90 text-foreground/70",
  success: "border-success/20 bg-success/10 text-success",
  danger: "border-danger/20 bg-danger/10 text-danger",
};

const cardToneStyles: Record<Tone, string> = {
  brand:
    "border-red-500/15 bg-gradient-to-br from-red-500/10 via-white to-white text-foreground shadow-sm shadow-red-900/5",
  neutral: "border-border/70 bg-default-50/85 text-foreground",
  success: "border-success/20 bg-success/10 text-success",
  danger: "border-danger/20 bg-danger/10 text-danger",
};

interface TableLeadCellProps {
  title: string;
  eyebrow?: string;
  description?: string;
  popoverContent?: ReactNode;
}

export function TableLeadCell({
  title,
  eyebrow,
  description,
  popoverContent,
}: TableLeadCellProps) {
  const content = (
    <div className="min-w-0 flex-1">
      <div className="flex max-w-[12rem] sm:max-w-[16rem] flex-col gap-1.5">
        {eyebrow ? (
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
            {eyebrow}
          </span>
        ) : null}

        <span className="line-clamp-2 text-base font-semibold leading-snug text-foreground sm:text-lg md:text-xl">
          {title}
        </span>

        {description ? (
          <span className="line-clamp-2 text-sm leading-relaxed text-foreground/60 sm:text-base">
            {truncateString(description, 110)}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!popoverContent) return <div className="flex w-full">{content}</div>;

  return (
    <Popover
      content={
        <div className="max-w-xs sm:max-w-md space-y-2 text-sm sm:text-base leading-relaxed text-foreground">
          {popoverContent}
        </div>
      }
      placement="top-start"
    >
      <div className="group flex w-full max-w-[14rem] sm:max-w-[18rem] items-start gap-2 sm:gap-3">
        {content}

        <span className="mt-1 inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full border border-red-500/15 bg-red-500/5 text-red-700 transition-colors group-hover:border-red-500/30 group-hover:bg-red-500/10">
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>
      </div>
    </Popover>
  );
}

interface TablePillProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

export function TablePill({
  children,
  tone = "neutral",
  className,
}: TablePillProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 sm:gap-2 rounded-full border px-3 py-1.5 sm:px-3.5 sm:py-2 text-sm sm:text-base font-semibold",
        pillToneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

interface TableInlineTextProps {
  children: ReactNode;
  className?: string;
}

export function TableInlineText({
  children,
  className,
}: TableInlineTextProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-sm sm:text-base font-medium leading-relaxed text-foreground/70",
        className,
      )}
    >
      {children}
    </span>
  );
}

interface TableValueCardProps {
  eyebrow?: string;
  value: ReactNode;
  supportingText?: string;
  tone?: Tone;
  valueClassName?: string;
  className?: string;
}

export function TableValueCard({
  value,
  supportingText,
  tone = "neutral",
  valueClassName,
  className,
}: TableValueCardProps) {
  return (
    <div
      className={cn(
        "inline-flex flex-col gap-0.5 sm:gap-1 py-1 sm:py-1.5",
        className,
      )}
    >
      <span
        className={cn(
          "text-lg font-semibold leading-tight sm:text-xl md:text-2xl",
          tone === "brand" ? "text-primary" : "text-foreground",
          valueClassName,
        )}
      >
        {value}
      </span>

      {supportingText ? (
        <span className="text-xs leading-relaxed text-foreground/55 sm:text-sm">
          {supportingText}
        </span>
      ) : null}
    </div>
  );
}

interface TablePreviewTextProps {
  text?: string;
  fallback: string;
  fallbackTone?: Tone;
}

export function TablePreviewText({
  text,
  fallback,
  fallbackTone = "neutral",
}: TablePreviewTextProps) {
  if (!text) return <TablePill tone={fallbackTone}>{fallback}</TablePill>;

  return (
    <Popover
      content={
        <div className="max-w-md whitespace-pre-line text-base leading-relaxed text-foreground">
          {text}
        </div>
      }
      placement="top-start"
    >
      <div className="group flex max-w-[14rem] sm:max-w-[22rem] items-start gap-3">
        <span className="line-clamp-2 text-sm leading-relaxed text-foreground/70 sm:text-base">
          {truncateString(text, 110)}
        </span>

        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500/15 bg-red-500/5 text-red-700 transition-colors group-hover:border-red-500/30 group-hover:bg-red-500/10">
          <Info className="h-4 w-4" />
        </span>
      </div>
    </Popover>
  );
}

interface TableStatusPillProps {
  label: string;
  tone: Extract<Tone, "success" | "danger">;
}

export function TableStatusPill({ label, tone }: TableStatusPillProps) {
  return (
    <TablePill tone={tone} className="px-4 py-2 text-base">
      <span
        aria-hidden="true"
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          tone === "success" ? "bg-success" : "bg-danger",
        )}
      />
      {label}
    </TablePill>
  );
}
