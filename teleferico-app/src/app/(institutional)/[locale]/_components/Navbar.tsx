"use client";

import { useLocale } from "@/hooks";
import { i18n } from "@/i18n";
import { getTranslationValue } from "@/lib/actions";
import logoBlanco from "@/public/logo-negativo.svg";
import logoNegro from "@/public/logo.svg";
import type { Locales } from "@/types";
import { ROUTES } from "@/utils/routes.const";
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
} from "@nextui-org/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const langs: { locale: Locales; label: string }[] = [
  { locale: i18n.locales[0], label: "Español" },
  { locale: i18n.locales[1], label: "English" },
  { locale: i18n.locales[2], label: "Português" },
];

const {
  HOME,
  FOUNDATION,
  JOBS,
  LOCATION,
  ACTIVITIES,
  EXPLORE,
  NEWS,
  POLICIES,
  PRICINGSCHEDULES,
  CONTACT,
  FAQS,
} = ROUTES;

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDownScrolled, setIsDownScrolled] = useState(false);
  const [items, setItems] = useState<{ label: string; href: string }[]>([]);
  const { language, pathname } = useLocale();
  const { push } = useRouter();
  const isPathInList = useMemo(
    () =>
      [NEWS, POLICIES, JOBS, CONTACT, FAQS].some((route) =>
        pathname.includes(route),
      ),
    [pathname],
  );
  const logo = useMemo(
    () =>
      isPathInList || isMenuOpen || isDownScrolled ? logoNegro : logoBlanco,
    [isMenuOpen, isDownScrolled, isPathInList],
  );
  const navbarStyle = useMemo(
    () => ({
      base:
        isDownScrolled || isMenuOpen || isPathInList
          ? ["bg-white text-black"]
          : ["bg-transparent text-white"],
    }),
    [isDownScrolled, isMenuOpen, isPathInList],
  );

  useEffect(() => {
    const getItems = async () => {
      const navbarIntl = await getTranslationValue(
        language,
        "components.Navbar",
      );
      setItems([
        { label: navbarIntl.home, href: HOME },
        { label: navbarIntl.location, href: LOCATION },
        { label: navbarIntl.activities, href: ACTIVITIES },
        { label: navbarIntl.explore, href: EXPLORE },
        {
          label: navbarIntl.pricingschedules,
          href: PRICINGSCHEDULES,
        },
        { label: navbarIntl.news, href: NEWS },
        { label: navbarIntl.foundation, href: FOUNDATION },
      ]);
    };

    getItems();
  }, [language]);

  return (
    <NuiNavbar
      position="sticky"
      className="h-20 max-w-full transition duration-150 ease-in"
      onMenuOpenChange={setIsMenuOpen}
      isBlurred={false}
      onScrollPositionChange={(position) => {
        if (position !== 0 && !isDownScrolled) {
          setIsDownScrolled(true);
        } else if (position === 0) {
          setIsDownScrolled(false);
        }
      }}
      classNames={{ ...navbarStyle, wrapper: ["max-w-[1600px]"] }}
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="md:hidden"
        />
        <NavbarBrand>
          <Link href={HOME} className="text-inherit">
            <Image src={logo} alt="logo teleferico" width={130} height={50} />
          </Link>
        </NavbarBrand>
      </NavbarContent>
      <NavbarContent className="hidden gap-3 md:flex" justify="end">
        {items.map((item, index) => (
          <NavbarItem
            key={index}
            isActive={
              item.href === "/"
                ? pathname === "/"
                : pathname.includes(item.href)
            }
          >
            <Link href={item.href} className="text-sm text-inherit">
              {item.label}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>
      <NavbarContent justify="end">
        <Select
          variant="bordered"
          className="w-[115px]"
          classNames={{
            trigger: ["border-none", "shadow-none"],
            value: ["text-red-600", "group-data-[has-value=true]:text-inherit"],
          }}
          items={langs}
          disallowEmptySelection={true}
          defaultSelectedKeys={new Set([language])}
          onSelectionChange={(key) => {
            push(key.currentKey + pathname);
          }}
        >
          {(item) => <SelectItem key={item.locale}>{item.label}</SelectItem>}
        </Select>
      </NavbarContent>
      <NavbarMenu>
        {items.map((item, index) => (
          <NavbarMenuItem key={index}>
            <Link className="w-full text-inherit" href={item.href} size="lg">
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </NuiNavbar>
  );
}
