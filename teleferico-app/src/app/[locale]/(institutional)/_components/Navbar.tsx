"use client";

import { CustomLink } from "@/components";
import { useLocale, useScrollDirection } from "@/hooks";
import { i18n } from "@/i18n";
import logoBlanco from "@/public/logo-negativo.svg";
import logoNegro from "@/public/logo.svg";
import type { Locales } from "@/types";
import { ROUTES, cn } from "@/utils";
import {
  Link,
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
import { useMemo, useState } from "react";

const langs: { locale: Locales; label: string }[] = [
  { locale: i18n.locales[0], label: "Español" },
  { locale: i18n.locales[1], label: "English" },
  { locale: i18n.locales[2], label: "Português" },
];

interface Props {
  items: { label: string; href: string }[];
}

const { HOME, JOBS, NEWS, POLICIES, CONTACT, FAQS } = ROUTES;

export default function Navbar(props: Props) {
  const { items } = props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { locale, pathname } = useLocale();
  const { push } = useRouter();
  const { direction, isScrolled } = useScrollDirection({ threshold: 12 });
  const isCompact = direction === "down" && isScrolled;
  const isPathInList = useMemo(
    () =>
      [NEWS, POLICIES, JOBS, CONTACT, FAQS].some((route) =>
        pathname.includes(route),
      ),
    [pathname],
  );
  const logo = useMemo(
    () => (isPathInList || isMenuOpen || isScrolled ? logoNegro : logoBlanco),
    [isMenuOpen, isPathInList, isScrolled],
  );
  const useSolidBackground = isScrolled || isMenuOpen || isPathInList;

  const itemBaseClass = useMemo(
    () =>
      cn(
        "group relative inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200",
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
          ? "bg-background/90 text-foreground shadow-sm"
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
          className={cn(
            "md:hidden",
            "text-current",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        />
        <NavbarBrand>
          <Link
            href={HOME}
            className="flex items-center gap-3 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Image
              src={logo}
              alt="Teleferico Cerro Otto"
              width={140}
              height={48}
              priority
            />
          </Link>
        </NavbarBrand>
      </NavbarContent>
      <NavbarContent className="hidden gap-1 md:flex" justify="end">
        {items.map((item, index) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.includes(item.href);

          return (
            <NavbarItem key={index} isActive={isActive} className="px-0">
              <CustomLink
                href={item.href}
                className={cn(
                  itemBaseClass,
                  isActive &&
                    (useSolidBackground
                      ? "text-foreground"
                      : "text-white"),
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
          className="w-[132px]"
          classNames={{
            trigger: [
              "h-10 rounded-full border border-border/50 bg-background/80 px-3 text-sm transition-colors",
              "hover:border-primary/40 focus:border-primary/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            ],
            value: ["text-foreground"],
            popoverContent: ["rounded-2xl border border-border/60 bg-background/95 backdrop-blur"],
          }}
          items={langs}
          disallowEmptySelection={true}
          defaultSelectedKeys={new Set([locale])}
          onSelectionChange={(key) => {
            // TODO: Using the "es-AR" prefix crashes the navigation
            // Maybe the middleware's rewrite function has something to do with it
            if (key.currentKey === "es-AR") push(pathname);
            else push(`/${key.currentKey}${pathname}`);
          }}
        >
          {(item) => <SelectItem key={item.locale}>{item.label}</SelectItem>}
        </Select>
      </NavbarContent>
      <NavbarMenu className="border-t border-border/40 bg-background/95 px-4 py-6 text-foreground backdrop-blur-xl">
        {items.map((item, index) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.includes(item.href);

          return (
            <NavbarMenuItem key={index} className="px-0">
              <CustomLink
                href={item.href}
                className="block w-full rounded-xl px-4 py-2 text-base font-medium text-foreground transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-current={isActive ? "page" : undefined}
                onClick={() => setIsMenuOpen(false)}
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
