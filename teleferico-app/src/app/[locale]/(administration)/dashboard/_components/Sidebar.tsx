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
import { getAdminLoginUrl } from "@/lib/constants/routes.const";
import LogoRecortado from "@/public/logo-recortado.svg";
import { Tooltip } from "@heroui/react";
import {
  Building2,
  BusFront,
  CircleDollarSign,
  Image as LucideImage,
  MessageCircleQuestionMark,
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
import type { DashboardShellProjection } from "./dashboard-shell-projection";

const SIDEBAR_ICONS: Record<
  DashboardShellProjection["contentNavigation"][number]["icon"],
  React.ComponentType
> = {
  "admin-gallery": LucideImage,
  "admin-users": User,
  buses: BusFront,
  faqs: MessageCircleQuestionMark,
  news: Rss,
  prices: CircleDollarSign,
  recruitment: PersonStanding,
  revalidate: Repeat2,
  zones: Building2,
};

export default function Sidebar({
  projection,
}: {
  projection: DashboardShellProjection;
}) {
  const pathname = usePathname();

  return (
    <SidebarContainer>
      <SidebarHeader>
        <Link href={projection.dashboardHref} className="m-auto">
          <Image src={LogoRecortado} alt="logo recortado" />
        </Link>
      </SidebarHeader>
      {projection.contentNavigation.length > 0 ? (
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {projection.contentNavigation.map((item) => {
                  const ItemIcon = SIDEBAR_ICONS[item.icon];

                  return (
                    <SidebarMenuItem key={item.name}>
                      {item.isDisabled ? (
                        <Tooltip
                          placement="right"
                          content={
                            !item.implemented
                              ? "Opción no implementada"
                              : "Acceso no permitido para tu rol"
                          }
                        >
                          <div
                            className="w-full cursor-not-allowed"
                            tabIndex={0}
                          >
                            <SidebarMenuButton
                              size="adaptative"
                              disabled
                              aria-disabled
                              className="cursor-not-allowed flex-col"
                              isActive={false}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <ItemIcon />
                                <p className="text-center text-sm leading-4">
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
                              <ItemIcon />
                              <p className="text-center text-sm leading-4">
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
      ) : null}
      {projection.showLogout ? (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-primary hover:bg-primary/20 hover:text-primary"
                onClick={() => signOut({ redirectTo: getAdminLoginUrl() })}
              >
                <Power size={16} />
                <p>Salir</p>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      ) : null}
    </SidebarContainer>
  );
}
