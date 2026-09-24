import { useEffect, useState } from "react";

export const MOBILE_BREAKPOINT = 820;

export const isMobileViewport = (
  width: number,
  breakpoint = MOBILE_BREAKPOINT,
) => width < breakpoint;

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return !!isMobile;
}
