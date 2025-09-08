"use client";

import { buttonStyles } from "@/components/shared/ButtonDos";
import { ADMIN_ROUTES } from "@/utils";
import { Tabs as NextUITabs, Tab } from "@heroui/react";
import { useState } from "react";
import ActivitiesTable from "./ActivitiesTable";
import TicketsTable from "./TicketsTable";

export default function Tabs() {
  const [selected, setSelected] = useState<string | number>("tickets");

  return (
    <div className="flex w-full flex-col">
      <NextUITabs
        aria-label="Opciones"
        variant="underlined"
        selectedKey={selected}
        onSelectionChange={setSelected}
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
          <TicketsTable />
        </Tab>
        <Tab key="activities" title={<span>Actividades</span>}>
          <ActivitiesTable />
        </Tab>
        <Tab
          key="create"
          href={
            selected === "tickets"
              ? ADMIN_ROUTES.NEW_ACCESS_TICKET
              : ADMIN_ROUTES.NEW_ACTIVITY_TICKET
          }
          title={
            <span className="text-white">
              {selected === "tickets" ? "Nuevo ticket" : "Nueva actividad"}
            </span>
          }
          className={`${buttonStyles({ intent: "solid", className: "ml-auto" })}`}
        />
      </NextUITabs>
    </div>
  );
}
