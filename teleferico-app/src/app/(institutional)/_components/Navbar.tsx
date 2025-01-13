"use client";

import logoNegativo from "@/public/logo-negativo.svg";
import logoPositivo from "@/public/logo.svg";
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
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

const langs = [
  { locale: "es-AR", label: "Español" },
  { locale: "en", label: "English" },
  { locale: "pt", label: "Português" },
];
const { HOME, INFO } = ROUTES;

const items = [
  { title: "Inicio", route: HOME },
  { title: "Como Llegar", route: INFO },
  { title: "¿Qué hacer?", route: INFO },
  { title: "La cumbre", route: INFO },
  { title: "Tarifas Y Horarios", route: INFO },
  { title: "Noticias", route: INFO },
  { title: "Fundación", route: INFO },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDownScrolled, setIsDownScrolled] = useState(false);
  const [logo, setLogo] = useState(logoNegativo);
  const pathname = usePathname();
  const navbarStyle = useMemo(
    () => ({
      base:
        isDownScrolled || isMenuOpen
          ? ["bg-white text-black"]
          : ["bg-transparent text-white"],
    }),
    [isDownScrolled, isMenuOpen],
  );

  return (
    <NuiNavbar
      position="sticky"
      className="h-20 max-w-full transition duration-150 ease-in"
      onMenuOpenChange={(isOpen) => {
        setIsMenuOpen(isOpen);
        if (isOpen) {
          setLogo(logoPositivo);
        } else if (!isDownScrolled) {
          setLogo(logoNegativo);
        }
      }}
      isBlurred={false}
      onScrollPositionChange={(position) => {
        if (position !== 0 && !isDownScrolled) {
          console.log("enter");
          setIsDownScrolled(true);
          setLogo(logoPositivo);
        } else if (position === 0) {
          setIsDownScrolled(false);
          setLogo(logoNegativo);
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
          <NavbarItem key={index} isActive={item.route === pathname}>
            <Link href={item.route} className="text-sm text-inherit">
              {item.title}
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
          defaultSelectedKeys={new Set([langs[0].locale])}
        >
          {(item) => <SelectItem key={item.locale}>{item.label}</SelectItem>}
        </Select>
      </NavbarContent>
      <NavbarMenu>
        {items.map((item, index) => (
          <NavbarMenuItem key={index}>
            <Link className="w-full text-inherit" href={item.route} size="lg">
              {item.title}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </NuiNavbar>
  );
}
