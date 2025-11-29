"use client";

import type { Zone } from "@/types";
import { STRAPI_ENDPOINTS } from "@/utils";
import { addToast, Switch } from "@heroui/react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { updateZoneOpenStatusAction } from "./actions";
import { useAppAlert } from "@/hooks";

interface Props {
  zone: Zone;
}

export default function ZoneOpenToggle({ zone }: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(() => zone.isOpen ?? false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { mutate } = useSWRConfig();
  const { showAlert } = useAppAlert();

  useEffect(() => {
    setIsOpen(zone.isOpen ?? false);
  }, [zone.isOpen]);

  const handleToggle = async (nextValue: boolean) => {
    if (isUpdating) return;

    const previousValue = isOpen;
    setIsOpen(nextValue);
    setIsUpdating(true);

    try {
      const res = await updateZoneOpenStatusAction(zone.documentId, nextValue);

      if (!res.success) {
        setIsOpen(previousValue);
        showAlert({
          title: "Error",
          message: "No se pudo actualizar el estado de la zona.",
          variant: "danger",
        });
        console.log(res?.message ?? "Failed to update zone open status.");
        return;
      }

      await mutate(
        (key) => key === `${STRAPI_ENDPOINTS.ZONES}/${zone.documentId}`,
        undefined,
        { revalidate: true },
      );

      addToast({
        title: "El estado de la zona se actualizó correctamente.",
        color: "success",
        timeout: 5000,
      });
    } catch (error) {
      setIsOpen(previousValue);
      showAlert({
        title: "Error",
        message:
          "Ocurrió un error inesperado al actualizar el estado de la zona.",
        variant: "danger",
      });
      console.log("Unexpected error updating zone open status.", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Switch
      isSelected={isOpen}
      onValueChange={handleToggle}
      isDisabled={isUpdating}
      color="primary"
      aria-label="Cambiar estado de la zona"
      size="sm"
    />
  );
}
