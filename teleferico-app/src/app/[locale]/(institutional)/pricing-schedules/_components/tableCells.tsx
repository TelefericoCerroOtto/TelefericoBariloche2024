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
      <div className="flex max-w-[22rem] flex-col gap-1.5">
        {eyebrow ? (
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
            {eyebrow}
          </span>
        ) : null}

        <span className="text-base font-semibold leading-snug text-foreground sm:text-lg md:text-xl">
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
        <div className="max-w-md space-y-2 text-base leading-relaxed text-foreground">
          {popoverContent}
        </div>
      }
      placement="top-start"
    >
      <div className="group flex w-full max-w-[24rem] items-start gap-3">
        {content}

        <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500/15 bg-red-500/5 text-red-700 transition-colors group-hover:border-red-500/30 group-hover:bg-red-500/10">
          <Info className="h-4 w-4" />
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
  eyebrow: string;
  value: ReactNode;
  supportingText?: string;
  tone?: Tone;
  valueClassName?: string;
  className?: string;
}

export function TableValueCard({
  eyebrow,
  value,
  supportingText,
  tone = "neutral",
  valueClassName,
  className,
}: TableValueCardProps) {
  return (
    <div
      className={cn(
        "inline-flex min-w-[7.5rem] max-w-[13rem] flex-col rounded-2xl border px-3 py-2 sm:px-3.5 sm:py-2.5",
        cardToneStyles[tone],
        className,
      )}
    >
      <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.26em] text-foreground/45">
        {eyebrow}
      </span>

      <span
        className={cn(
          "mt-1 text-lg font-semibold leading-tight text-foreground sm:text-xl md:text-2xl",
          valueClassName,
        )}
      >
        {value}
      </span>

      {supportingText ? (
        <span className="mt-1 text-xs leading-relaxed text-foreground/55 sm:mt-2 sm:text-sm md:text-base">
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
      <div className="group flex max-w-[22rem] items-start gap-3">
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
