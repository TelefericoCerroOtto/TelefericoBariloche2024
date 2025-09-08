"use client";

import {
  SidebarContainer,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/Sidebar";
import LogoRecortado from "@/public/logo-recortado.svg";
import { ADMIN_ROUTES } from "@/utils";
import {
  Building2,
  BusFront,
  CircleDollarSign,
  Image as LucideImage,
  PersonStanding,
  Power,
  Repeat2,
  Rss,
  User,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    name: "Horarios Zonas",
    url: ADMIN_ROUTES.ZONES,
    icon: Building2,
  },
  {
    name: "Tarifas",
    url: ADMIN_ROUTES.PRICES,
    icon: CircleDollarSign,
  },
  {
    name: "Buses",
    url: ADMIN_ROUTES.BUSES,
    icon: BusFront,
  },
  {
    name: "Noticias",
    url: ADMIN_ROUTES.NEWS,
    icon: Rss,
  },
  {
    name: "Multimedia",
    url: ADMIN_ROUTES.ADMIN_GALLERY,
    icon: LucideImage,
  },
  {
    name: "Trabajo",
    url: ADMIN_ROUTES.RECRUITMENT,
    icon: PersonStanding,
  },
  {
    name: "Usuarios",
    url: ADMIN_ROUTES.ADMIN_USERS,
    icon: User,
  },
  {
    name: "Revalidar",
    url: ADMIN_ROUTES.REVALIDATE,
    icon: Repeat2,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <SidebarContainer>
      <SidebarHeader>
        <Link href={ADMIN_ROUTES.DASHBOARD} className="m-auto">
          <Image src={LogoRecortado} alt="logo recortado" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((project) => (
                <SidebarMenuItem key={project.name}>
                  <SidebarMenuButton
                    asChild
                    size="adaptative"
                    isActive={pathname.includes(project.url)}
                  >
                    <Link href={project.url} className="flex flex-col">
                      <project.icon />
                      <p className="text-center text-[11px] leading-3">
                        {project.name}
                      </p>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-primary hover:bg-primary/20 hover:text-primary"
              onClick={() => signOut({ redirectTo: "/login" })}
            >
              <Power size={16} />
              <p>Salir</p>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarContainer>
  );
}
