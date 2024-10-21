"use client";

import { ROUTES } from "@/utils/routes.const";
import {
  Link,
  Navbar as NuiNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@nextui-org/react";
import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { HOME, INFO, ACTIVITIES, GALLERY, NEWS, JOBS } = ROUTES;
  const items = [
    { title: "Informacion General", route: INFO },
    { title: "Actividades", route: ACTIVITIES },
    { title: "Galeria", route: GALLERY },
    { title: "Noticias", route: NEWS },
    { title: "Trabajo", route: JOBS },
  ];

  return (
    <NuiNavbar
      position="sticky"
      className="text-black"
      isBlurred={true}
      isBordered
      disableAnimation
      onMenuOpenChange={setIsMenuOpen}
    >
      <NavbarBrand>
        <Link href={HOME} className="text-inherit">
          LOGO
          <p className="font-bold text-inherit">TELEFERICO</p>
        </Link>
      </NavbarBrand>
      <NavbarContent className="hidden gap-4 sm:flex" justify="center">
        {items.map((item, index) => (
          <NavbarItem key={index}>
            <Link color="foreground" href={item.route}>
              {item.title}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>
      <NavbarMenu>
        {items.map((item, index) => (
          <NavbarMenuItem key={index}>
            <Link
              color="foreground"
              className="w-full"
              href={item.route}
              size="lg"
            >
              {item.title}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
      <NavbarContent className="sm:hidden" justify="end">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
        />
      </NavbarContent>
    </NuiNavbar>
  );
}
