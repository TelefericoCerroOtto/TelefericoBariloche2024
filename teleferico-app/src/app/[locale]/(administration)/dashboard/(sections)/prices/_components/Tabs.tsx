// teleferico-app/src/app/[locale]/(administration)/dashboard/(sections)/prices/_components/Tabs.tsx

"use client";

import { Button, Tabs as HeroTabs, Tab } from "@heroui/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ADMIN_ROUTES } from "@/lib/constants/routes.const";

import Link from "next/link";
import ActivitiesAdminTable from "./ActivitiesAdminTable";
import TicketsAdminTable from "./TicketsAdminTable";

const ALLOWED_SELECTED = ["tickets", "activities"] as const;
type AllowedSelected = (typeof ALLOWED_SELECTED)[number];

function isAllowedSelected(v: string | null): v is AllowedSelected {
  return v !== null && (ALLOWED_SELECTED as readonly string[]).includes(v);
}

function safeSelected(v: string | null): AllowedSelected {
  return isAllowedSelected(v) ? v : "tickets";
}

function replaceSelectedInUrl(pathname: string, nextSelected: AllowedSelected) {
  // No navigation: only updates the address bar
  const params = new URLSearchParams(window.location.search);
  params.set("selected", nextSelected);
  const nextUrl = `${pathname}?${params.toString()}`;
  window.history.replaceState(null, "", nextUrl);
}

export default function Tabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedFromQuery = useMemo(
    () => searchParams.get("selected"),
    [searchParams],
  );

  // Local state drives the UI (instant, no navigation)
  const [selected, setSelected] = useState<AllowedSelected>(() =>
    safeSelected(selectedFromQuery),
  );

  // Sync local state when the URL changes due to real navigations
  // (e.g., arriving from another page with ?selected=activities)
  useEffect(() => {
    const next = safeSelected(selectedFromQuery);
    setSelected(next);

    // Guard: if query is missing/invalid, normalize URL WITHOUT navigation
    if (
      !isAllowedSelected(selectedFromQuery) &&
      typeof window !== "undefined"
    ) {
      replaceSelectedInUrl(pathname, next);
    }
  }, [selectedFromQuery, pathname]);

  const onSelectionChange = (key: string | number) => {
    const nextRaw = String(key);

    // Ignore non-content tabs (e.g. "create") as selection
    if (!isAllowedSelected(nextRaw)) return;

    setSelected(nextRaw);

    // Keep URL in sync without triggering Next navigation
    replaceSelectedInUrl(pathname, nextRaw);
  };

  const createHref =
    selected === "tickets"
      ? ADMIN_ROUTES.NEW_ACCESS_TICKET
      : ADMIN_ROUTES.NEW_ACTIVITY_TICKET;

  return (
    <div className="flex w-full flex-col">
      <HeroTabs
        aria-label="Opciones"
        variant="underlined"
        selectedKey={selected}
        onSelectionChange={onSelectionChange}
        classNames={{
          tabList:
            "gap-6 w-full relative rounded-none px-6 border-b border-divider",
          cursor: "w-full bg-custom-red",
          tab: "max-w-fit px-0 h-12",
          tabContent: "group-data-[selected=true]:text-custom-red",
          panel: "p-0",
        }}
      >
        <Tab key="tickets" title={<span>Acceso</span>}>
          <TicketsAdminTable />
        </Tab>

        <Tab key="activities" title={<span>Actividades</span>}>
          <ActivitiesAdminTable />
        </Tab>

        <Tab
          key="create"
          title={
            <Button as={Link} href={createHref} variant="solid" color="primary">
              {selected === "tickets" ? "Nuevo ticket" : "Nueva actividad"}
            </Button>
          }
          className="ml-auto"
        />
      </HeroTabs>
    </div>
  );
}
