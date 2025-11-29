"use client";

import { AppAlertProvider } from "@/components/shared/AppAlertProvider";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { SSRProvider } from "@react-aria/ssr";
import { SWRConfig } from "swr";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SSRProvider>
      <HeroUIProvider>
        <AppAlertProvider>
          <ToastProvider placement="top-center" />
          <SWRConfig
            value={{
              revalidateOnFocus: true,
              refreshWhenOffline: false,
              focusThrottleInterval: 1 * 60 * 1000,
            }}
          >
            {children}
          </SWRConfig>
        </AppAlertProvider>
      </HeroUIProvider>
    </SSRProvider>
  );
}
