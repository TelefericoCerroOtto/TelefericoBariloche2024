"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { SWRConfig } from "swr";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <ToastProvider placement="top-center" />
      <SWRConfig
        value={{
          revalidateOnFocus: true,
          refreshWhenOffline: false,
          focusThrottleInterval: 6000,
        }}
      >
        {children}
      </SWRConfig>
    </HeroUIProvider>
  );
}
