"use client";

import { CustomLink } from "@/components";
import { useLocale, useScrollDirection } from "@/hooks";
import { i18n } from "@/i18n";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import logoBlanco from "@/public/logo-negativo.svg";
import logoNegro from "@/public/logo.svg";
import type { Locales } from "@/types";
import { cn } from "@/utils";
import {
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Navbar as NuiNavbar,
  Select,
  SelectItem,
} from "@heroui/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

const langs: { locale: Locales; label: string }[] = [
  { locale: i18n.locales[0], label: "Español" },
  { locale: i18n.locales[1], label: "English" },
  { locale: i18n.locales[2], label: "Português" },
];

interface Props {
  items: { label: string; href: string }[];
}

const { HOME, JOBS, NEWS, POLICIES, CONTACT, FAQS } = PUBLIC_ROUTES;

export default function Navbar(props: Props) {
  const { items } = props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const { locale, pathname, fullPathname } = useLocale();
  const { push } = useRouter();
  const { direction, isScrolled } = useScrollDirection({ threshold: 12 });
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCompact = direction === "down" && isScrolled;
  const isNavigating = pendingNavigation !== null;

  const isPathInList = useMemo(
    () =>
      [NEWS, POLICIES, JOBS, CONTACT, FAQS].some((route) =>
        pathname.includes(route),
      ),
    [pathname],
  );

  const useSolidBackground = isScrolled || isMenuOpen || isPathInList;

  const logo = useMemo(
    () => (isPathInList || isMenuOpen || isScrolled ? logoNegro : logoBlanco),
    [isMenuOpen, isPathInList, isScrolled],
  );

  useEffect(() => {
    if (!isNavigating) return;

    setPendingNavigation(null);

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, [fullPathname, isNavigating]);

  useEffect(
    () => () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    },
    [],
  );

  const startNavigationGuard = (target: string) => {
    if (isNavigating) return false;

    setPendingNavigation(target);

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    navigationTimeoutRef.current = setTimeout(() => {
      setPendingNavigation(null);
      navigationTimeoutRef.current = null;
    }, 1800);

    return true;
  };

  const shouldBypassGuard = (event: MouseEvent<HTMLAnchorElement>) =>
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey;

  const handleLinkNavigation = (
    target: string,
    options?: { closeMenu?: boolean; disabled?: boolean },
  ) => {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      if (shouldBypassGuard(event)) return;

      if (options?.closeMenu) {
        setIsMenuOpen(false);
      }

      if (options?.disabled || isNavigating) {
        event.preventDefault();
        return;
      }

      startNavigationGuard(target);
    };
  };

  const itemBaseClass = useMemo(
    () =>
      cn(
        "group relative inline-flex items-center rounded-full px-3 py-1.5 text-xl font-medium transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        useSolidBackground
          ? "text-muted-foreground hover:text-foreground"
          : "text-white/80 hover:text-white",
      ),
    [useSolidBackground],
  );

  return (
    <NuiNavbar
      as="nav"
      aria-label="Main"
      position="sticky"
      onMenuOpenChange={setIsMenuOpen}
      isBlurred={false}
      className={cn(
        "top-0 z-50 w-full border-b border-border/40 px-4 transition-all duration-300 ease-out md:px-6",
        "supports-[backdrop-filter]:backdrop-blur-xl",
        useSolidBackground
          ? "bg-background/90 bg-gray-100 text-foreground shadow-sm"
          : "bg-transparent text-white",
        isCompact ? "h-14 md:h-16" : "h-16 md:h-20",
      )}
      classNames={{
        wrapper: ["max-w-[1600px]", "px-0"],
        item: ["data-[active=true]:text-primary"],
      }}
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
        />
        <NavbarBrand>
          <CustomLink
            href={HOME}
            aria-disabled={pathname === HOME || isNavigating}
            onClick={handleLinkNavigation(HOME, {
              disabled: pathname === HOME,
            })}
            className="flex items-center gap-3 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Image
              src={logo}
              alt="Teleferico Cerro Otto"
              width={140}
              height={48}
              priority
            />
          </CustomLink>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden gap-1 lg:flex" justify="end">
        {items.map((item, index) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.includes(item.href);
          const isExactMatch = pathname === item.href;

          return (
            <NavbarItem key={index} isActive={isActive} className="px-0">
              <CustomLink
                href={item.href}
                aria-disabled={isExactMatch || isNavigating}
                onClick={handleLinkNavigation(item.href, { disabled: isExactMatch })}
                className={cn(
                  itemBaseClass,
                  isActive &&
                    (useSolidBackground ? "text-foreground" : "text-white"),
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute bottom-0 left-3 right-3 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-200",
                    "group-hover:scale-x-100 group-focus-visible:scale-x-100",
                    isActive && "scale-x-100",
                  )}
                />
              </CustomLink>
            </NavbarItem>
          );
        })}
      </NavbarContent>

      <NavbarContent justify="end">
        <Select
          variant="bordered"
          aria-label="Change language"
          className="w-[160px]" // un toque más ancho para la tipografía grande
          isDisabled={isNavigating}
          classNames={{
            trigger: [
              "h-11 rounded-full border border-border/50 bg-white px-3 text-base md:text-lg leading-6 transition-colors",
              "border-black/40 focus:border-primary/80",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            ],
            // asegura tamaño también en el valor renderizado
            value: ["text-base md:text-lg leading-6 text-foreground"],
            selectorIcon: ["text-foreground scale-110"], // ícono un pelín más grande
            popoverContent: [
              "rounded-2xl border border-border/60 bg-background/95 backdrop-blur",
            ],
          }}
          items={langs}
          disallowEmptySelection
          defaultSelectedKeys={new Set([locale])}
          onSelectionChange={(key) => {
            const href = `/${key.currentKey}${pathname}`;

            if (href === fullPathname || !startNavigationGuard(href)) {
              return;
            }

            push(href);
          }}
        >
          {(item) => (
            <SelectItem
              key={item.locale}
              className="text-base leading-6 md:text-lg"
            >
              {item.label}
            </SelectItem>
          )}
        </Select>
      </NavbarContent>

      <NavbarMenu className="border-t border-border/40 bg-background/95 px-4 py-6 text-foreground backdrop-blur-xl">
        {items.map((item, index) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.includes(item.href);
          const isExactMatch = pathname === item.href;

          return (
            <NavbarMenuItem key={index} className="px-0">
              <CustomLink
                href={item.href}
                aria-disabled={isExactMatch || isNavigating}
                onClick={handleLinkNavigation(item.href, {
                  closeMenu: true,
                  disabled: isExactMatch,
                })}
                className="block w-full rounded-xl px-4 py-2 text-lg font-medium text-foreground transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </CustomLink>
            </NavbarMenuItem>
          );
        })}
      </NavbarMenu>
    </NuiNavbar>
  );
}
