import LogoRecortado from "@/public/logo-recortado.svg";
import { Card, CardBody } from "@heroui/react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  OctagonAlert,
} from "lucide-react";

import { cn } from "@/utils";

export type AppAlertVariant =
  | "danger"
  | "success"
  | "info"
  | "warning"
  | "default"
  | "black";

export interface AppAlertProps {
  title: string;
  message: string;
  variant: AppAlertVariant;
}

const variantStyles: Record<
  AppAlertVariant,
  {
    icon: LucideIcon;
    container: string;
    accent: string;
    iconColor: string;
    title: string;
    message: string;
    logoPanel?: string;
  }
> = {
  danger: {
    icon: OctagonAlert,
    container: "bg-red-50 border-custom-red/30 text-custom-red",
    accent: "bg-custom-red/10",
    iconColor: "text-custom-red",
    title: "text-custom-red",
    message: "text-custom-red/80",
  },
  success: {
    icon: CheckCircle2,
    container: "bg-emerald-50 border-custom-green/30 text-custom-green",
    accent: "bg-custom-green/10",
    iconColor: "text-custom-green",
    title: "text-custom-green",
    message: "text-custom-green/80",
  },
  info: {
    icon: Info,
    container: "bg-sky-50 border-custom-blue/30 text-custom-blue",
    accent: "bg-custom-blue/10",
    iconColor: "text-custom-blue",
    title: "text-custom-blue",
    message: "text-custom-blue/80",
  },
  warning: {
    icon: AlertTriangle,
    container: "bg-amber-50 border-custom-orange/30 text-custom-orange",
    accent: "bg-custom-orange/10",
    iconColor: "text-custom-orange",
    title: "text-custom-orange",
    message: "text-custom-orange/80",
  },
  default: {
    icon: Bell,
    container: "bg-white border-border text-foreground",
    accent: "bg-foreground/5",
    iconColor: "text-foreground",
    title: "text-foreground",
    message: "text-foreground/80",
    logoPanel: "bg-white/70",
  },
  black: {
    icon: Bell,
    container: "bg-foreground border-foreground text-background",
    accent: "bg-background/20",
    iconColor: "text-background",
    title: "text-background",
    message: "text-background/80",
    logoPanel: "bg-background/10",
  },
};

export default function AppAlert({ title, message, variant }: AppAlertProps) {
  const styles = variantStyles[variant] ?? variantStyles.default;
  const Icon = styles.icon;

  return (
    <Card
      as="section"
      role="alert"
      aria-live="polite"
      className={cn(
        "w-full overflow-hidden rounded-xl border shadow-sm backdrop-blur transition-colors duration-200",
        styles.container,
      )}
    >
      <CardBody className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border/40", // subtle frame for the logo
            styles.accent,
            styles.logoPanel,
          )}
        >
          <Image
            src={LogoRecortado}
            alt="Teleférico Cerro Otto"
            width={42}
            height={42}
            className="h-10 w-10 object-contain"
          />
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                styles.accent,
              )}
            >
              <Icon className={cn("h-5 w-5", styles.iconColor)} />
            </span>

            <div className="space-y-1">
              <p
                className={cn(
                  "text-base font-semibold leading-tight sm:text-lg",
                  styles.title,
                )}
              >
                {title}
              </p>
              <p
                className={cn(
                  "text-sm leading-relaxed sm:text-base",
                  styles.message,
                )}
              >
                {message}
              </p>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
