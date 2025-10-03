"use client";

import { useEffect, useRef, useState } from "react";

type Direction = "up" | "down";

interface Options {
  /**
   * Minimum scroll distance before updating the direction to avoid flickering.
   */
  threshold?: number;
}

export function useScrollDirection(options: Options = {}) {
  const { threshold = 8 } = options;
  const [direction, setDirection] = useState<Direction>("up");
  const [isScrolled, setIsScrolled] = useState(false);
  const lastPositionRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastPositionRef.current;

      setIsScrolled(currentY > threshold);

      const delta = currentY - lastY;
      if (Math.abs(delta) > threshold && currentY >= 0) {
        setDirection(delta > 0 ? "down" : "up");
        lastPositionRef.current = currentY;
        return;
      }

      if (currentY < threshold) {
        setDirection("up");
        lastPositionRef.current = currentY;
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return { direction, isScrolled };
}
