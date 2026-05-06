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

const { HOME } = PUBLIC_ROUTES;

export default function Navbar(props: Props) {
  const { items } = props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const { locale, pathname, fullPathname } = useLocale();
  const { push } = useRouter();
  const { isScrolled } = useScrollDirection({ threshold: 12 });
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isNavigating = pendingNavigation !== null;

  const useSolidBackground = isScrolled || isMenuOpen;

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

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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
          : "text-primary-foreground/85 hover:text-primary-foreground",
      ),
    [useSolidBackground],
  );

  return (
    <NuiNavbar
      as="nav"
      aria-label="Main"
      position="sticky"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      isBlurred={false}
      className={cn(
        "top-0 z-50 w-full px-3 transition-colors duration-300 ease-out sm:px-4 md:px-6",
        "supports-[backdrop-filter]:backdrop-blur-xl",
        useSolidBackground
          ? "border-b border-border/60 bg-background/95 text-foreground shadow-sm"
          : "border-b border-white/10 bg-custom-red text-primary-foreground",
        "h-16 md:h-20",
      )}
      classNames={{
        wrapper: ["max-w-[1600px]", "h-16 px-0 md:h-20"],
        item: ["data-[active=true]:text-primary"],
      }}
    >
      <NavbarContent className="min-w-0 gap-2">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
        />
        <NavbarBrand>
          <CustomLink
            href={HOME}
            aria-label="Teleferico Cerro Otto"
            aria-disabled={pathname === HOME || isNavigating}
            onClick={handleLinkNavigation(HOME, {
              closeMenu: true,
              disabled: pathname === HOME,
            })}
            className="flex items-center gap-3 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="relative block h-12 w-[120px] shrink-0 sm:w-[140px]">
              <Image
                src={logoBlanco}
                alt=""
                aria-hidden="true"
                width={140}
                height={48}
                priority
                className={cn(
                  "absolute left-0 top-0 transition-opacity duration-200 ease-out",
                  useSolidBackground ? "opacity-0" : "opacity-100",
                )}
              />
              <Image
                src={logoNegro}
                alt=""
                aria-hidden="true"
                width={140}
                height={48}
                priority
                className={cn(
                  "absolute left-0 top-0 transition-opacity duration-200 ease-out",
                  useSolidBackground ? "opacity-100" : "opacity-0",
                )}
              />
            </span>
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
                      "pointer-events-none absolute bottom-0 left-3 right-3 h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-200",
                      useSolidBackground ? "bg-custom-red" : "bg-white",
                      "group-hover:scale-x-100 group-focus-visible:scale-x-100",
                      isActive && "scale-x-100",
                    )}
                />
              </CustomLink>
            </NavbarItem>
          );
        })}
      </NavbarContent>

      <NavbarContent className="min-w-0 justify-end" justify="end">
        <Select
          variant="bordered"
          size="sm"
          aria-label="Change language"
          className="w-[clamp(96px,22vw,160px)]"
          isDisabled={isNavigating}
          popoverProps={{
            classNames: {
              base: "z-[60]",
              content: "z-[60]",
            },
          }}
          classNames={{
            trigger: [
              "h-10 rounded-full px-2 text-sm leading-5 transition-colors md:h-11 md:px-3 md:text-base md:leading-6",
              useSolidBackground
                ? "border border-black/15 bg-white text-foreground focus:border-primary/80"
                : "border border-white/80 bg-white text-foreground focus:border-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            ],
            // asegura tamaño también en el valor renderizado
            value: [
              cn(
                "min-w-0 truncate text-sm leading-5 md:text-base md:leading-6",
                "text-foreground",
              ),
            ],
            selectorIcon: [
              cn(
                "scale-90 md:scale-110",
                "text-foreground",
              ),
            ], // ícono un pelín más grande
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
