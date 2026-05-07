"use client";

import { useAppAlert } from "@/hooks";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { Activity } from "@/types";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { Ban, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { updateActivityStatusAction } from "./actions";
import { DISABLED_STATE_MESSAGE, ENABLED_STATE_MESSAGE } from "./data";

export default function ActivityActiveToggle({
  activity,
}: {
  activity: Activity;
}) {
  const [isActive, setIsActive] = useState<boolean>(
    () => activity.isActive ?? false,
  );
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isUpdating, setIsUpdating] = useState(false);
  const { mutate } = useSWRConfig();
  const { showAlert } = useAppAlert();

  useEffect(() => {
    setIsActive(activity.isActive ?? false);
  }, [activity.isActive]);

  const handleToggle = async (nextValue: boolean, onClose: () => void) => {
    if (isUpdating) return;

    const previousValue = isActive;
    setIsUpdating(true);

    try {
      const res = await updateActivityStatusAction(activity.documentId, {
        isActive: nextValue,
      });

      if (!res.success) {
        setIsActive(previousValue);
        showAlert({
          title: "Error",
          message: "No se pudo actualizar el estado de la actividad.",
          variant: "danger",
        });
        console.log(res?.message ?? "Failed to update activity active status.");
        return;
      }

      setIsActive(nextValue);

      await mutate(
        (key) => key === `${STRAPI_ENDPOINTS.ZONES}/${activity.documentId}`,
        undefined,
        { revalidate: true },
      );

      const name = activity.activity_translations[0]?.name ?? "esta actividad";

      showAlert({
        title: nextValue ? "Actividad publicada" : "Actividad ocultada",
        variant: nextValue ? "success" : "warning",
        message: nextValue
          ? `La actividad “${name}” ya está visible para el público en el sitio.`
          : `La actividad “${name}” dejó de estar visible para el público en el sitio.`,
      });

      onClose();
    } catch (error) {
      setIsActive(previousValue);
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
    <div className="flex justify-start">
      <Button
        variant="ghost"
        size="md"
        color={isActive ? "danger" : "success"}
        startContent={isActive ? <Ban size={20} /> : <Play size={20} />}
        onPress={onOpen}
      >
        {isActive ? "Ocultar" : "Publicar"}
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        shouldCloseOnInteractOutside={() => !isUpdating}
        hideCloseButton={isUpdating}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {isActive ? "Ocultar actividad" : "Publicar actividad"}
              </ModalHeader>

              <ModalBody>
                {isActive ? DISABLED_STATE_MESSAGE : ENABLED_STATE_MESSAGE}
              </ModalBody>

              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                  isDisabled={isUpdating}
                >
                  Cancelar
                </Button>

                <Button
                  color={isActive ? "danger" : "success"}
                  isLoading={isUpdating}
                  onPress={() => handleToggle(!isActive, onClose)}
                >
                  {isActive ? "Ocultar" : "Publicar"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
