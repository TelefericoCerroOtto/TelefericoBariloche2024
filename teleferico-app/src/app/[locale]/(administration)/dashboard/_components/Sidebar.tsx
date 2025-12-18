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
import type { UserRole } from "@/types";
import { ADMIN_ROUTES } from "@/utils";
import { Tooltip } from "@heroui/react";
import {
  Building2,
  BusFront,
  CircleDollarSign,
  Image as LucideImage,
  PersonStanding,
  Power,
  Repeat2,
  Rss,
  MessageCircleQuestionMark,
  User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarItem = {
  name: string;
  url: string;
  icon: React.ComponentType;
  implemented: boolean;
  tooltip?: string;
  // If omitted, all roles are allowed
  allowedRoles?: UserRole["name"][];
};

const items: SidebarItem[] = [
  {
    name: "Horarios Zonas",
    url: ADMIN_ROUTES.ZONES,
    icon: Building2,
    implemented: true,
    tooltip: "Gestionar horarios y zonas del complejo",
    allowedRoles: ["Administrator", "Operations Supervisor"],
  },
  {
    name: "Tarifas",
    url: ADMIN_ROUTES.PRICES,
    icon: CircleDollarSign,
    implemented: true,
    tooltip: "Gestionar tarifas de ascenso y actividades",
    allowedRoles: ["Administrator", "Operations Supervisor"],
  },
  {
    name: "Buses",
    url: ADMIN_ROUTES.BUSES,
    icon: BusFront,
    implemented: true,
    tooltip: "Gestionar horarios de viajes de buses",
    allowedRoles: ["Administrator", "Operations Supervisor"],
  },
  {
    name: "Noticias",
    url: ADMIN_ROUTES.NEWS,
    icon: Rss,
    implemented: true,
    tooltip: "Gestionar noticias del sitio web",
    allowedRoles: ["Administrator", "Media Manager"],
  },
  {
    name: "Preguntas Frecuentes",
    url: ADMIN_ROUTES.FAQS,
    icon: MessageCircleQuestionMark,
    implemented: true,
    tooltip: "Gestionar preguntas frecuentes del sitio web",
    allowedRoles: ["Administrator", "Media Manager"],
  },
  {
    name: "Multimedia",
    url: ADMIN_ROUTES.ADMIN_GALLERY,
    icon: LucideImage,
    implemented: false,
    tooltip: "Gestión de recursos multimedia",
    allowedRoles: ["Administrator", "Media Manager"],
  },
  {
    name: "Trabajo",
    url: ADMIN_ROUTES.RECRUITMENT,
    icon: PersonStanding,
    implemented: true,
    tooltip: "Gestionar curriculums de postulantes",
    allowedRoles: ["Administrator", "Recruiter"],
  },
  {
    name: "Usuarios",
    url: ADMIN_ROUTES.ADMIN_USERS,
    icon: User,
    implemented: false,
    tooltip: "Gestión de usuarios del sistema",
    allowedRoles: ["Administrator"],
  },
  {
    name: "Revalidar",
    url: ADMIN_ROUTES.REVALIDATE,
    icon: Repeat2,
    implemented: true,
    tooltip: "Revalidar la caché del sitio web",
    allowedRoles: ["Administrator"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const currentRole = session?.user?.role?.name;

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
              {items.map((item) => {
                const roleAllowed =
                  !item.allowedRoles ||
                  (currentRole !== undefined &&
                    item.allowedRoles.includes(currentRole));
                const isDisabled = !item.implemented || !roleAllowed;

                return (
                  <SidebarMenuItem key={item.name}>
                    {isDisabled ? (
                      <Tooltip
                        placement="right"
                        content={
                          !item.implemented
                            ? "Opción no implementada"
                            : "Acceso no permitido para tu rol"
                        }
                      >
                        <div className="w-full cursor-not-allowed" tabIndex={0}>
                          <SidebarMenuButton
                            size="adaptative"
                            disabled
                            aria-disabled
                            className="cursor-not-allowed flex-col"
                            isActive={false}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <item.icon />
                              <p className="text-center text-[11px] leading-3">
                                {item.name}
                              </p>
                            </div>
                          </SidebarMenuButton>
                        </div>
                      </Tooltip>
                    ) : (
                      <Tooltip placement="right" content={item.tooltip ?? ""}>
                        <SidebarMenuButton
                          asChild
                          size="adaptative"
                          isActive={pathname.includes(item.url)}
                        >
                          <Link
                            href={item.url}
                            className="flex flex-col"
                            aria-disabled={false}
                          >
                            <item.icon />
                            <p className="text-center text-[11px] leading-3">
                              {item.name}
                            </p>
                          </Link>
                        </SidebarMenuButton>
                      </Tooltip>
                    )}
                  </SidebarMenuItem>
                );
              })}
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
