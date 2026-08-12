import type { ServiceStateValues } from "@/types";
import { CableCar, Clock, Cog } from "lucide-react";
import { createElement, type ReactNode } from "react";
import {
  getMaintenanceServiceStatusCopy,
  resolveMaintenanceServiceStatus,
  type MaintenanceLocale,
} from "./maintenance-service-status";

type MaintenanceCopy = {
  title: string;
  message: string;
};

type MaintenanceStatusSectionProps = {
  locale: MaintenanceLocale;
  maintenanceCopy: MaintenanceCopy;
  serviceState?: unknown;
  isLoading: boolean;
  isError: boolean;
};

const STATE_STYLES: Record<
  ServiceStateValues,
  {
    border: string;
    background: string;
    accentText: string;
    iconBackground: string;
    iconColor: string;
  }
> = {
  normal: {
    border: "border-emerald-200",
    background: "bg-emerald-50",
    accentText: "text-emerald-800",
    iconBackground: "bg-emerald-600",
    iconColor: "text-white",
  },
  conditional: {
    border: "border-sky-200",
    background: "bg-sky-50",
    accentText: "text-sky-800",
    iconBackground: "bg-sky-600",
    iconColor: "text-white",
  },
  restricted: {
    border: "border-amber-200",
    background: "bg-amber-50",
    accentText: "text-amber-900",
    iconBackground: "bg-amber-600",
    iconColor: "text-white",
  },
  suspended: {
    border: "border-rose-200",
    background: "bg-rose-50",
    accentText: "text-rose-800",
    iconBackground: "bg-rose-600",
    iconColor: "text-white",
  },
  closed: {
    border: "border-slate-300",
    background: "bg-slate-100",
    accentText: "text-slate-900",
    iconBackground: "bg-slate-700",
    iconColor: "text-white",
  },
};

function renderMaintenanceCard(copy: MaintenanceCopy) {
  return createElement(
    "div",
    {
      className:
        "rounded-[1.75rem] border border-custom-red/20 bg-[linear-gradient(135deg,rgba(255,248,247,0.98),rgba(255,243,241,0.95))] p-5 shadow-sm sm:p-6",
      "data-maintenance-card": true,
    },
    createElement(
      "div",
      { className: "flex flex-col gap-4 sm:flex-row sm:items-start" },
      createElement(
        "div",
        {
          className:
            "relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-custom-red/30 bg-custom-red/10 shadow-sm",
          "aria-hidden": "true",
        },
        createElement(Cog, {
          className: "h-11 w-11 text-custom-red animate-spin",
          style: { animationDuration: "10s" },
        }),
        createElement(Cog, {
          className:
            "absolute bottom-2 right-2 h-6 w-6 text-custom-red/70 animate-spin",
          style: {
            animationDuration: "6s",
            animationDirection: "reverse",
          },
        }),
      ),
      createElement(
        "div",
        { className: "space-y-2" },
        createElement(
          "p",
          {
            className:
              "text-base font-semibold uppercase tracking-[0.24em] text-foreground/55",
          },
          copy.title,
        ),
        createElement(
          "p",
          {
            className:
              "text-base leading-7 text-foreground/70 sm:text-lg sm:leading-8",
          },
          copy.message,
        ),
      ),
    ),
  );
}

function renderLoadingCard(locale: MaintenanceLocale) {
  const copy = getMaintenanceServiceStatusCopy(locale);

  return createElement(
    "section",
    {
      className:
        "flex min-h-40 items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6",
      "aria-live": "polite",
      "aria-busy": "true",
      "data-service-status-card": "loading",
    },
    createElement(
      "span",
      {
        className:
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400",
        "aria-hidden": "true",
      },
      createElement(CableCar, { className: "h-8 w-8" }),
    ),
    createElement(
      "div",
      { className: "min-w-0 flex-1 space-y-3" },
      createElement(
        "p",
        { className: "text-sm font-semibold text-slate-600 sm:text-base" },
        copy.loading,
      ),
      createElement("div", {
        className:
          "h-7 w-full max-w-sm animate-pulse rounded-full bg-slate-200",
        "aria-hidden": "true",
      }),
      createElement("div", {
        className:
          "h-5 w-full max-w-xs animate-pulse rounded-full bg-slate-100",
        "aria-hidden": "true",
      }),
    ),
  );
}

function renderServiceStatusCard(
  locale: MaintenanceLocale,
  serviceState: unknown,
) {
  const data =
    serviceState && typeof serviceState === "object" && "data" in serviceState
      ? serviceState.data
      : null;
  if (!data || typeof data !== "object") return null;

  const payload = data as Record<string, unknown>;
  const status = resolveMaintenanceServiceStatus(
    payload.state,
    payload.updatedAt,
    locale,
  );
  if (!status) return null;

  const styles = STATE_STYLES[status.state];
  const timestamp: ReactNode = status.formattedUpdatedAt
    ? createElement(
        "p",
        {
          className:
            "mt-3 inline-flex items-center gap-2 text-sm text-foreground/55 sm:text-base",
        },
        createElement(Clock, {
          className: "h-4 w-4",
          "aria-hidden": "true",
        }),
        `${status.lastUpdated}: ${status.formattedUpdatedAt}`,
      )
    : null;
  const title: ReactNode = status.title
    ? createElement(
        "h2",
        {
          className: `mt-2 text-2xl font-semibold tracking-tight sm:text-3xl ${styles.accentText}`,
        },
        status.title,
      )
    : null;
  const description: ReactNode = status.stateDesc
    ? createElement(
        "p",
        {
          className:
            "mt-2 text-base leading-7 text-foreground/70 sm:text-lg sm:leading-8",
        },
        status.stateDesc,
      )
    : null;

  return createElement(
    "section",
    {
      className: `min-h-40 rounded-[1.75rem] border p-5 shadow-sm sm:p-6 ${styles.border} ${styles.background}`,
      "aria-labelledby": "maintenance-service-status-legend",
      "aria-live": "polite",
      "data-service-status-card": status.state,
    },
    createElement(
      "div",
      { className: "flex flex-col gap-4 sm:flex-row sm:items-start" },
      createElement(
        "span",
        {
          className: `flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-inner shadow-black/10 ${styles.iconBackground}`,
          "aria-hidden": "true",
        },
        createElement(CableCar, {
          className: `h-8 w-8 ${styles.iconColor}`,
        }),
      ),
      createElement(
        "div",
        { className: "min-w-0 flex-1" },
        createElement(
          "p",
          {
            id: "maintenance-service-status-legend",
            className:
              "text-sm font-semibold uppercase tracking-[0.24em] text-foreground/55 sm:text-base",
          },
          status.stateLegend,
        ),
        title,
        description,
        timestamp,
      ),
    ),
  );
}

export function MaintenanceStatusSection({
  locale,
  maintenanceCopy,
  serviceState,
  isLoading,
  isError,
}: MaintenanceStatusSectionProps) {
  const serviceStatusCard = isLoading
    ? renderLoadingCard(locale)
    : !isError && serviceState
      ? renderServiceStatusCard(locale, serviceState)
      : null;

  return createElement(
    "div",
    { className: "mt-8 max-w-2xl space-y-4" },
    renderMaintenanceCard(maintenanceCopy),
    serviceStatusCard,
  );
}
