"use client";

import { useAppAlert } from "@/hooks";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { BusTrip } from "@/types";
import { addToast, Switch } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { updateVisibleStatusAction } from "./actions";

interface Props {
  busTrip: BusTrip;
}

export default function VisibleToggle({ busTrip }: Props) {
  const [isVisible, setIsVisible] = useState<boolean>(
    () => busTrip.isVisible ?? false,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const { mutate } = useSWRConfig();
  const { showAlert } = useAppAlert();

  useEffect(() => {
    setIsVisible(busTrip.isVisible ?? false);
  }, [busTrip.isVisible]);

  const handleToggle = async (nextValue: boolean) => {
    if (isUpdating) return;

    const previousValue = isVisible;
    setIsVisible(nextValue);
    setIsUpdating(true);

    try {
      const res = await updateVisibleStatusAction(busTrip.documentId, {
        isVisible: nextValue,
      });

      if (!res.success) {
        setIsVisible(previousValue);
        showAlert({
          title: "Error",
          message: "No se pudo actualizar el estado de visibilidad del viaje.",
          variant: "danger",
        });
        console.log(
          res?.message ?? "Failed to update bus trip visibility status.",
        );
        return;
      }

      await mutate(
        (key) => key === `${STRAPI_ENDPOINTS.BUS_TRIPS}/${busTrip.documentId}`,
        undefined,
        { revalidate: true },
      );

      addToast({
        title: nextValue ? "Viaje en bus VISIBLE" : "Viaje en bus OCULTO",
        color: "success",
        timeout: 5000,
      });
    } catch (error) {
      setIsVisible(previousValue);
      showAlert({
        title: "Error",
        message:
          "Ocurrió un error inesperado al actualizar el estado de visibilidad del viaje.",
        variant: "danger",
      });
      console.log(
        "Unexpected error updating bus trip visibility status.",
        error,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Switch
      isSelected={isVisible}
      onValueChange={handleToggle}
      isDisabled={isUpdating}
      startContent={<Eye />}
      endContent={<EyeOff />}
      color="primary"
      aria-label="Cambiar visibilidad del viaje"
      size="lg"
    />
  );
}
