type LoadingIndicatorProps = {
  label: string;
  className?: string;
};

export function LoadingIndicator({ label, className }: LoadingIndicatorProps) {
  return (
    <div
      aria-live="polite"
      className={[
        "inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
    >
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-300/80 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}
