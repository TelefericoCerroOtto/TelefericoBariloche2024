"use client";

import { buttonStyles } from "@/components/ui/ButtonDos";
import { Tabs as NextUITabs, Tab } from "@nextui-org/react";
import { useState } from "react";
import ActivitiesTable from "./ActivitiesTable";
import CablecarTable from "./CablecarTable";
import { ADMIN_ROUTES } from "@/utils/routes.const";

export default function Tabs() {
  const [selected, setSelected] = useState<string | number>("photos");

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
        }}
      >
        <Tab key="access" title={<span>Acceso</span>}>
          <CablecarTable />
        </Tab>
        <Tab key="actividades" title={<span>Actividades</span>}>
          <ActivitiesTable />
        </Tab>
        <Tab
          key="create"
          href={
            selected === "access"
              ? ADMIN_ROUTES.NEW_CABLECAR_TICKET
              : ADMIN_ROUTES.NEW_ACTIVITY_TICKET
          }
          title={<span className="text-white">Nueva tarifa</span>}
          className={`${buttonStyles({ intent: "solid", className: "ml-auto" })}`}
        />
      </NextUITabs>
    </div>
  );
}
