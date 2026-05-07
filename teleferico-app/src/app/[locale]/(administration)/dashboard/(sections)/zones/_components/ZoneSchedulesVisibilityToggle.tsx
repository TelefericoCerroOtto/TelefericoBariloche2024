"use client";

import { useAppAlert } from "@/hooks";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { Zone } from "@/types";
import { addToast, Button } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { updateZoneSchedulesVisibilityAction } from "./actions";

interface Props {
  zone: Zone;
}

export default function ZoneSchedulesVisibilityToggle({ zone }: Props) {
  const [isVisible, setIsVisible] = useState<boolean>(() => !zone.hide);
  const [isUpdating, setIsUpdating] = useState(false);
  const { mutate } = useSWRConfig();
  const { showAlert } = useAppAlert();

  useEffect(() => {
    setIsVisible(!zone.hide);
  }, [zone.hide]);

  const handleToggle = async (nextValue: boolean) => {
    if (isUpdating) return;

    const previousValue = isVisible;
    setIsVisible(nextValue);
    setIsUpdating(true);

    try {
      const res = await updateZoneSchedulesVisibilityAction(
        zone.documentId,
        nextValue,
      );

      if (!res.success) {
        setIsVisible(previousValue);
        showAlert({
          title: "Error",
          message: "No se pudo actualizar la visibilidad de la zona en horarios.",
          variant: "danger",
        });
        console.log(
          res?.message ?? "Failed to update zone schedules visibility.",
        );
        return;
      }

      await mutate(
        (key) => key === `${STRAPI_ENDPOINTS.ZONES}/${zone.documentId}`,
        undefined,
        { revalidate: true },
      );

      addToast({
        title: nextValue
          ? `${zone.zone_translations[0].name} visible en horarios`
          : `${zone.zone_translations[0].name} oculto de horarios`,
        color: nextValue ? "success" : "warning",
        timeout: 5000,
      });
    } catch (error) {
      setIsVisible(previousValue);
      showAlert({
        title: "Error",
        message:
          "Ocurrió un error inesperado al actualizar la visibilidad de la zona.",
        variant: "danger",
      });
      console.log("Unexpected error updating zone schedules visibility.", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button
      type="button"
      isIconOnly
      onPress={() => void handleToggle(!isVisible)}
      isDisabled={isUpdating}
      color={isVisible ? "primary" : "default"}
      variant={isVisible ? "solid" : "bordered"}
      aria-label={
        isVisible
          ? "Ocultar zona de horarios"
          : "Mostrar zona en horarios"
      }
    >
      {isVisible ? <Eye /> : <EyeOff />}
    </Button>
  );
}
