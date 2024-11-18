"use client";

import type { Selection } from "@nextui-org/react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Spinner,
  User,
} from "@nextui-org/react";
import { Check } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";

export default function DropdownCablecarMenu({
  children,
}: {
  // eslint-disable-next-line no-unused-vars
  children: (isLoading: boolean) => ReactNode;
}) {
  /**
   * Items must be declared within the component's scope to trigger
   * a re-render of the list when the isLoading state changes.
   * This occurs because a new instance is created, resulting in a change
   * of the items array reference.
   */

  const items = [
    { key: "normal", color: "-custom-green", title: "Normal" },
    { key: "conditional", color: "-custom-blue", title: "Condicional" },
    {
      key: "restricted",
      color: "-custom-orange",
      title: "Condicional con restricciones",
    },
    { key: "suspended", color: "-custom-red", title: "Suspendido" },
    { key: "closed", color: "-black", title: "Cerrado" },
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(
    new Set(["normal"]),
  );

  const selectedValue = useMemo(
    () => Array.from(selectedKeys).join(", ").replaceAll("_", " "),
    [selectedKeys],
  );

  return (
    <Dropdown
      closeOnSelect={false}
      shouldCloseOnInteractOutside={() => !isLoading}
    >
      <DropdownTrigger>{children(isLoading)}</DropdownTrigger>
      <DropdownMenu
        disallowEmptySelection
        selectionMode="single"
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
        onAction={async (keys) => {
          // Here goes the API call.
          setIsLoading(true);
          await setTimeout(() => {
            setIsLoading(false);
          }, 2000);
        }}
        hideSelectedIcon
      >
        <DropdownSection>
          <DropdownItem
            key="service-state"
            className="h-14 cursor-default gap-2"
            isReadOnly
            showDivider
            textValue="Estado del servicio"
          >
            <User
              name="Estado del servicio"
              description="El servicio funciona con normalidad"
              classNames={{
                name: "text-default-600",
                description: "text-default-500",
              }}
              avatarProps={{
                size: "sm",
                src: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
              }}
            />
          </DropdownItem>
        </DropdownSection>
        <DropdownSection items={items}>
          {(item) => (
            <DropdownItem
              key={item.key}
              className={`text${item.color}`}
              isReadOnly={isLoading}
              endContent={
                selectedValue === item.key ? (
                  isLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <Check size={16} />
                  )
                ) : null
              }
              textValue={item.title}
            >
              {item.title}
            </DropdownItem>
          )}
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}
