"use client";

import { DropdownCablecarMenu } from "@/components";
import type { UserRole } from "@/types";
import { Button, Tooltip } from "@heroui/react";
import { CableCar } from "lucide-react";

export default function ServiceButton({
  currentRole,
}: {
  currentRole: UserRole["name"];
}) {
  const allowedRoles: UserRole["name"][] = [
    "Administrator",
    "Operations Supervisor",
  ];
  const roleAllowed = allowedRoles.includes(currentRole);

  if (!roleAllowed) {
    return (
      <Tooltip content="No tienes permisos para cambiar el estado del servicio">
        <div
          className="inline-block cursor-not-allowed"
          tabIndex={0}
          aria-disabled
        >
          <Button
            className="shrink-0 whitespace-nowrap bg-green-100 text-green-900 outline-none hover:bg-green-300"
            radius="full"
            startContent={<CableCar />}
            isDisabled
          >
            Estado del servicio
          </Button>
        </div>
      </Tooltip>
    );
  }

  return (
    <DropdownCablecarMenu>
      {(isLoading) => (
        <Button
          className="shrink-0 whitespace-nowrap bg-green-100 text-green-900 outline-none hover:bg-green-300"
          radius="full"
          startContent={<CableCar />}
          isDisabled={isLoading}
        >
          Estado del servicio
        </Button>
      )}
    </DropdownCablecarMenu>
  );
}
