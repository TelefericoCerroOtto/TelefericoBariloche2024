"use client";

import { buttonStyles } from "@/utils/styles";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import { Tabs as NextUITabs, Tab } from "@nextui-org/react";
import { useState } from "react";
import AccessTable from "./AccessTable";
import ActivitiesTable from "./ActivitiesTable";

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
          panel: "p-0",
        }}
      >
        <Tab key="access" title={<span>Acceso</span>}>
          <AccessTable />
        </Tab>
        <Tab key="actividades" title={<span>Actividades</span>}>
          <ActivitiesTable />
        </Tab>
        <Tab
          key="create"
          href={
            selected === "access"
              ? ADMIN_ROUTES.NEW_ACCESS_TICKET
              : ADMIN_ROUTES.NEW_ACTIVITY_TICKET
          }
          title={<span className="text-white">Nueva tarifa</span>}
          className={`${buttonStyles({ intent: "solid", className: "ml-auto" })}`}
        />
      </NextUITabs>
    </div>
  );
}
