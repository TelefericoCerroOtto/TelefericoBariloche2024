"use client";

import { useAppAlert } from "@/hooks";
import { getStateAction, updateStateAction } from "@/lib/actions";
import type { ServiceStateValues } from "@/types";
import {
  addToast,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Spinner,
  type Selection,
} from "@heroui/react";
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

  const items: {
    key: ServiceStateValues;
    title: string;
    description: string;
  }[] = [
    {
      key: "normal",
      title: "Normal",
      description: "El medio de elevación funciona con normalidad",
    },
    {
      key: "conditional",
      title: "Condicional",
      description: "El medio de elevación funciona con posibles demoras",
    },
    {
      key: "restricted",
      title: "Condicional con restricciones",
      description: "El medio de elevación funciona con restricciones severas",
    },
    {
      key: "suspended",
      title: "Suspendido",
      description:
        "El medio de elevación se encuentra suspendido temporalmente",
    },
    {
      key: "closed",
      title: "Cerrado",
      description: "El medio de elevación se encuentra cerrado por el día",
    },
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(
    new Set(["normal"]),
  );
  const { showAlert } = useAppAlert();

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
      className="w-72"
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

            if (res.ok) {
              return addToast({
                title:
                  "Estado del medio de elevación actualizado correctamente",
                color: "success",
                timeout: 2000,
              });
            }

            console.log("update state action failed", res.data);
            setSelectedKeys(prevValue);
            return;
          } catch (error) {
            setIsLoading(false);
            showAlert({
              title: "Error",
              message:
                "Ocurrio un error al actualizar el estado del medio de elevación",
              variant: "danger",
            });
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
            <p className="text-default-600">
              <strong>Estado del servicio</strong>
            </p>
            <p className="text-default-500">
              {items.find((item) => item.key === selectedValue)?.description}
            </p>
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
