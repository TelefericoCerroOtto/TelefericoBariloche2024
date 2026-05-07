"use client";

import { useAppAlert } from "@/hooks";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { Zone } from "@/types";
import { addToast, Checkbox } from "@heroui/react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { updateZoneFeaturedStatusAction } from "./actions";

interface Props {
  zone: Zone;
}

export default function ZoneFeaturedToggle({ zone }: Props) {
  const [isFeatured, setIsFeatured] = useState<boolean>(
    () => zone.featured ?? false,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const { mutate } = useSWRConfig();
  const { showAlert } = useAppAlert();

  useEffect(() => {
    setIsFeatured(zone.featured ?? false);
  }, [zone.featured]);

  const handleToggle = async (nextValue: boolean) => {
    if (isUpdating) return;

    const previousValue = isFeatured;
    setIsFeatured(nextValue);
    setIsUpdating(true);

    try {
      const res = await updateZoneFeaturedStatusAction(
        zone.documentId,
        nextValue,
      );

      if (!res.success) {
        setIsFeatured(previousValue);
        showAlert({
          title: "Error",
          message: "No se pudo marcar como destacada esta zona.",
          variant: "danger",
        });
        console.log(res?.message ?? "Failed to update zone featured status.");
        return;
      }

      await mutate(
        (key) => key === `${STRAPI_ENDPOINTS.ZONES}/${zone.documentId}`,
        undefined,
        { revalidate: true },
      );

      addToast({
        title: nextValue
          ? `${zone.zone_translations[0].name} agregado/a a destacados`
          : `${zone.zone_translations[0].name} removido/a de destacados`,
        color: nextValue ? "success" : "warning",
        timeout: 5000,
      });
    } catch (error) {
      setIsFeatured(previousValue);
      showAlert({
        title: "Error",
        message:
          "Ocurrió un error inesperado al marcar la zona como destacada.",
        variant: "danger",
      });
      console.log("Unexpected error updating zone featured status.", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Checkbox
      isSelected={isFeatured}
      onValueChange={handleToggle}
      isDisabled={isUpdating}
      color="primary"
      aria-label="Destacar zona"
      size="lg"
    />
  );
}
