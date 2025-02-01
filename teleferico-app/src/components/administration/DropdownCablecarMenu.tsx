"use client";

import { getStateAction, updateStateAction } from "@/lib/actions/service-state";
import { ServiceStateValues } from "@/types";
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
import { ReactNode, useEffect, useMemo, useState } from "react";

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

  const items: { key: ServiceStateValues; title: string }[] = [
    { key: "normal", title: "Normal" },
    { key: "conditional", title: "Condicional" },
    {
      key: "restricted",
      title: "Condicional con restricciones",
    },
    { key: "suspended", title: "Suspendido" },
    { key: "closed", title: "Cerrado" },
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(
    new Set(["normal"]),
  );

  const selectedValue = useMemo(
    () => Array.from(selectedKeys).join(", ").replaceAll("_", " "),
    [selectedKeys],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await getStateAction();
        setIsLoading(false);
        console.log("getStateAction res", res);
        if (res.ok) return setSelectedKeys(new Set([res.data.data.state]));
        setSelectedKeys(new Set());
      } catch (error) {
        setIsLoading(false);
        console.log("useEffect on dropdown menu error", error);
      }
    };

    fetchData();
  }, []);

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
        onSelectionChange={async (keys) => {
          const prevValue = selectedKeys;

          try {
            setSelectedKeys(keys);
            setIsLoading(true);
            const res = await updateStateAction(
              keys.currentKey as ServiceStateValues,
            );
            setIsLoading(false);

            if (res.ok) return;

            alert("Ocurrio un error al actualizar el estado del servicio");
            console.log("update state action failed", res.data);
            setSelectedKeys(prevValue);
            return;
          } catch (error) {
            setIsLoading(false);
            alert("Ocurrio un error al actualizar el estado del servicio");
            console.log("update state on dropdown menu error", error);
          }
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
