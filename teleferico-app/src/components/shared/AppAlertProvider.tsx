"use client";

import AppAlert, { type AppAlertVariant } from "@/components/shared/AppAlert";
import { useLocale } from "@/hooks";
import { Button } from "@heroui/react";
import { createContext, useCallback, useState, type ReactNode } from "react";

type AlertConfig = {
  variant: AppAlertVariant;
  title: string;
  message: string;
  onConfirm?: () => void; // opcional por si querés hacer algo extra
};

type AppAlertContextValue = {
  // eslint-disable-next-line no-unused-vars
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
};

export const AppAlertContext = createContext<AppAlertContextValue | null>(null);

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const { locale } = useLocale();

  const showAlert = useCallback((config: AlertConfig) => {
    setAlertConfig(config);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(null);
  }, []);

  const handleConfirm = () => {
    if (alertConfig?.onConfirm) {
      alertConfig.onConfirm();
    }
    hideAlert();
  };

  const acceptLabel =
    {
      "es-AR": "Aceptar",
      en: "Accept",
      pt: "Aceitar",
    }[locale] ?? "Aceptar";

  return (
    <AppAlertContext.Provider value={{ showAlert, hideAlert }}>
      {/* Overlay tipo window.alert: fondo oscuro + contenido centrado */}
      {alertConfig && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md px-4">
            <AppAlert
              variant={alertConfig.variant}
              title={alertConfig.title}
              message={alertConfig.message}
            >
              <Button
                size="sm"
                color="primary"
                className="min-w-[100px]"
                onPress={handleConfirm}
              >
                {acceptLabel}
              </Button>
            </AppAlert>
          </div>
        </div>
      )}

      {children}
    </AppAlertContext.Provider>
  );
}
