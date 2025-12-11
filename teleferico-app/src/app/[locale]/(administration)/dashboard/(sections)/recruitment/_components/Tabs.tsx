"use client";

import type { Sector } from "@/types";
import { Tabs as NextUITabs, Tab } from "@heroui/react";
import { useState } from "react";
import PostulationsTable from "./PostulationTable/PostulationsTable";

interface Props {
  sectors: Sector[];
  userId: string;
}

export default function Tabs(props: Props) {
  const { sectors, userId } = props;
  const [selected, setSelected] = useState<string | number>("general");

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
        <Tab key="general" title={<span>Todas</span>}>
          <PostulationsTable sectors={sectors} userId={userId} />
        </Tab>
      </NextUITabs>
    </div>
  );
}
