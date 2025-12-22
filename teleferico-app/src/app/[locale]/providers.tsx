"use client";

import { AppAlertProvider } from "@/components/shared/AppAlertProvider";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { SSRProvider } from "@react-aria/ssr";
import { SWRConfig } from "swr";

const FOCUS_THROTTLE_INTERVAL_MS = 1 * 30 * 1000; // 30 seconds

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
              focusThrottleInterval: FOCUS_THROTTLE_INTERVAL_MS,
            }}
          >
            {children}
          </SWRConfig>
        </AppAlertProvider>
      </HeroUIProvider>
    </SSRProvider>
  );
}
