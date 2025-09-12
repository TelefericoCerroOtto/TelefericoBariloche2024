"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { SSRProvider } from "@react-aria/ssr";
import { SWRConfig } from "swr";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SSRProvider>
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
    </SSRProvider>
  );
}
