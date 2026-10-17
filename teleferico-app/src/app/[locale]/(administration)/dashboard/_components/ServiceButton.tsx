"use client";

import { DropdownCablecarMenu } from "@/components";
import { useServiceState } from "@/hooks";
import type { ServiceStateValues, UserRole } from "@/types";
import { Button } from "@heroui/react";
import { CableCar } from "lucide-react";

const SERVICE_STATE_LABELS: Record<ServiceStateValues, string> = {
  normal: "Normal",
  conditional: "Condicional",
  restricted: "Condicional con restricciones",
  suspended: "Suspendido",
  closed: "Cerrado",
};

export default function ServiceButton({
  currentRole,
}: {
  currentRole: UserRole["name"];
}) {
  if (currentRole !== "Administrator") return <ReadOnlyServiceState />;

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

function ReadOnlyServiceState() {
  const { serviceState, isError, isLoading } = useServiceState();
  const state = serviceState?.data?.state;
  const label = isError
    ? "No disponible"
    : state
      ? (SERVICE_STATE_LABELS[state] ?? "No disponible")
      : isLoading
        ? "Consultando..."
        : "No disponible";

  return (
    <output
      role="status"
      aria-live="polite"
      className="flex shrink-0 items-center gap-2 rounded-full bg-green-100 px-3 py-2 text-sm text-green-900"
    >
      <CableCar aria-hidden="true" className="size-4 shrink-0" />
      Estado del servicio: {label}
    </output>
  );
}
