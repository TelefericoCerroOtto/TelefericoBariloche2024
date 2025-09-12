"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { SSRProvider } from "@react-aria/ssr";
import { SWRConfig } from "swr";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

export function Providers({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  return (
    <SSRProvider>
      <SessionProvider session={session ?? undefined} refetchOnWindowFocus refetchInterval={0}>
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
      </SessionProvider>
    </SSRProvider>
  );
}
