import { Card, CardBody } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  OctagonAlert,
} from "lucide-react";
import type { ReactNode } from "react";

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
  children?: ReactNode;
}

const variantStyles: Record<
  AppAlertVariant,
  {
    icon: LucideIcon;
    bg: string;
    border: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
    messageColor: string;
  }
> = {
  danger: {
    icon: OctagonAlert,
    bg: "bg-white",
    border: "border-custom-red",
    iconBg: "bg-custom-red/10",
    iconColor: "text-custom-red",
    titleColor: "text-custom-red",
    messageColor: "text-slate-700",
  },
  success: {
    icon: CheckCircle2,
    bg: "bg-white",
    border: "border-custom-green",
    iconBg: "bg-custom-green/10",
    iconColor: "text-custom-green",
    titleColor: "text-custom-green",
    messageColor: "text-slate-700",
  },
  info: {
    icon: Info,
    bg: "bg-white",
    border: "border-custom-blue",
    iconBg: "bg-custom-blue/10",
    iconColor: "text-custom-blue",
    titleColor: "text-custom-blue",
    messageColor: "text-slate-700",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-white",
    border: "border-custom-orange",
    iconBg: "bg-custom-orange/10",
    iconColor: "text-custom-orange",
    titleColor: "text-custom-orange",
    messageColor: "text-slate-700",
  },
  default: {
    icon: Bell,
    bg: "bg-white",
    border: "border-border",
    iconBg: "bg-foreground/5",
    iconColor: "text-foreground",
    titleColor: "text-foreground",
    messageColor: "text-foreground/80",
  },
  black: {
    icon: Bell,
    bg: "bg-foreground",
    border: "border-foreground",
    iconBg: "bg-background/15",
    iconColor: "text-background",
    titleColor: "text-background",
    messageColor: "text-background/80",
  },
};

export default function AppAlert({
  title,
  message,
  variant,
  children,
}: AppAlertProps) {
  const styles = variantStyles[variant] ?? variantStyles.default;
  const Icon = styles.icon;

  return (
    <Card
      as="section"
      role="alert"
      aria-live="polite"
      className={`w-full rounded-2xl border shadow-md ${styles.bg} ${styles.border} `}
    >
      <CardBody className="p-6">
        <div className="flex gap-4">
          {/* Icono de la variante */}
          <div
            aria-hidden="true"
            className={`mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${styles.iconBg} `}
          >
            <Icon className={`h-6 w-6 ${styles.iconColor}`} />
          </div>

          {/* Texto + botón */}
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <p
                className={`text-lg font-semibold leading-tight sm:text-xl ${styles.titleColor} `}
              >
                {title}
              </p>
              <p
                className={`mt-1 text-base leading-relaxed sm:text-lg ${styles.messageColor} `}
              >
                {message}
              </p>
            </div>

            {children && <div className="flex justify-end">{children}</div>}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
