"use client";

import { useAppAlert } from "@/hooks";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { Faq } from "@/types";
import { addToast, Switch } from "@heroui/react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { updateFaqFeaturedStatus } from "./actions";

interface Props {
  faq: Faq;
  // eslint-disable-next-line no-unused-vars
  onUpdate?: (isUpdating: boolean) => void;
}

export default function FaqFeaturedToggle({ faq, onUpdate }: Props) {
  const [isFeatured, setIsFeatured] = useState<boolean>(
    () => faq.featured ?? false,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const { mutate } = useSWRConfig();
  const { showAlert } = useAppAlert();

  useEffect(() => {
    setIsFeatured(faq.featured ?? false);
  }, [faq.featured]);

  const handleToggle = async (nextValue: boolean) => {
    if (isUpdating) return;

    const previousValue = isFeatured;
    setIsFeatured(nextValue);
    setIsUpdating(true);
    onUpdate?.(true);

    try {
      const res = await updateFaqFeaturedStatus(faq.documentId, nextValue);

      if (!res.success) {
        setIsFeatured(previousValue);
        showAlert({
          title: "Error",
          message: "Algo falló al marcar como favorita la pregunta.",
          variant: "danger",
        });
        console.log(res?.message ?? "Failed to update faq featured status.");
        return;
      }

      await mutate(
        (key) => key === `${STRAPI_ENDPOINTS.FAQS}/${faq.documentId}`,
        undefined,
        { revalidate: true },
      );

      addToast({
        title: "Pregunta frecuente destacada.",
        color: "success",
        timeout: 5000,
      });
    } catch (error) {
      setIsFeatured(previousValue);
      showAlert({
        title: "Error",
        message: "Ocurrió un error inesperado",
        variant: "danger",
      });
      console.log("Unexpected error updating zone open status.", error);
    } finally {
      setIsUpdating(false);
      onUpdate?.(false);
    }
  };

  return (
    <Switch
      isSelected={isFeatured}
      onValueChange={handleToggle}
      isDisabled={isUpdating}
      color="primary"
      aria-label="Cambiar destacado de la pregunta"
      size="sm"
    />
  );
}
