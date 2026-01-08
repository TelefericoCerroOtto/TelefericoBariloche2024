"use client";

import { useAppAlert } from "@/hooks";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { Activity } from "@/types";
import { addToast, Switch } from "@heroui/react";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { updateActivityAvailableStatusAction } from "./actions";

interface Props {
  activity: Activity;
}

export default function ActivityAvailableToggle({ activity }: Props) {
  const [isAvailable, setIsAvailable] = useState<boolean>(
    () => activity.available ?? false,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const { mutate } = useSWRConfig();
  const { showAlert } = useAppAlert();

  useEffect(() => {
    setIsAvailable(activity.available ?? false);
  }, [activity.available]);

  const handleToggle = async (nextValue: boolean) => {
    if (isUpdating) return;

    const previousValue = isAvailable;
    setIsAvailable(nextValue);
    setIsUpdating(true);

    try {
      const res = await updateActivityAvailableStatusAction(
        activity.documentId,
        nextValue,
      );

      if (!res.success) {
        setIsAvailable(previousValue);
        showAlert({
          title: "Error",
          message: "No se pudo actualizar el estado de la actividad.",
          variant: "danger",
        });
        console.log(res?.message ?? "Failed to update activity open status.");
        return;
      }

      await mutate(
        (key) => key === `${STRAPI_ENDPOINTS.ZONES}/${activity.documentId}`,
        undefined,
        { revalidate: true },
      );

      addToast({
        title: "Disponibilidad de la actividad actualizada.",
        color: "success",
        timeout: 5000,
      });
    } catch (error) {
      setIsAvailable(previousValue);
      showAlert({
        title: "Error",
        message:
          "Ocurrió un error inesperado al actualizar el estado de la actividad.",
        variant: "danger",
      });
      console.log(
        "Unexpected error updating activity available status.",
        error,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Switch
      isSelected={isAvailable}
      onValueChange={handleToggle}
      isDisabled={isUpdating}
      startContent={<LockKeyholeOpen />}
      endContent={<LockKeyhole />}
      color="primary"
      aria-label="Cambiar estado de la zona"
      size="lg"
    />
  );
}
