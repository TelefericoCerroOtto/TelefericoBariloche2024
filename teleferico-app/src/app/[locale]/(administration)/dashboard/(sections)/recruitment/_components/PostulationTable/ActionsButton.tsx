"use client";

import { useAppAlert } from "@/hooks";
import { ROUTE_HANDLERS } from "@/lib/constants/routes.const";
import { authenticatedInternalApiFetch } from "@/lib/http/clients/auth-internal-fetch";
import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import { Eye, Heart, HeartOff } from "lucide-react";
import { useState } from "react";

interface Props {
  id: string;
  name: string;
  resumePath: string;
  isFavorite: boolean;
  // eslint-disable-next-line no-unused-vars
  onToggle?: (next: boolean) => void;
}

export default function ActionsButton(props: Props) {
  const { id, name, resumePath, isFavorite, onToggle } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [localFavorite, setLocalFavorite] = useState(isFavorite);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { showAlert } = useAppAlert();

  const handleToggleFavorite = async (nextFavorite: boolean) => {
    if (!id || isLoading) return;

    try {
      setIsLoading(true);

      const res = await authenticatedInternalApiFetch(
        ROUTE_HANDLERS.POSTULATIONS_FAVORITE(id),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ favorite: nextFavorite }),
        },
      );

      if (!res.ok) {
        console.log("toggle favorite error", await res.text());
        showAlert({
          title: "Error",
          message: "No se pudo actualizar el favorito",
          variant: "danger",
        });
        return;
      }

      setLocalFavorite(nextFavorite);
      onToggle?.(nextFavorite);

      addToast({
        title: nextFavorite ? "Añadido a favoritos" : "Removido de favoritos",
        color: nextFavorite ? "success" : "warning",
        icon: nextFavorite ? <Heart /> : <HeartOff />,
      });
    } catch (error) {
      console.error("toggle favorite error", error);
      showAlert({
        title: "Error",
        message: "Ocurrió un error al actualizar el favorito.",
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavoriteClick = () => {
    if (isLoading) return;

    if (localFavorite) {
      // Si ya es favorito, primero mostramos el modal de confirmación
      setIsConfirmOpen(true);
    } else {
      // Si no es favorito, lo agregamos directamente
      void handleToggleFavorite(true);
    }
  };

  const handleDownloadCv = () => {
    if (isLoading) return;

    if (!resumePath) {
      showAlert({
        title: "CV no disponible",
        message: "Esta postulación no tiene un currículum cargado.",
        variant: "warning",
      });
      return;
    }

    const url = `${ROUTE_HANDLERS.PROXY_FILE}${resumePath}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex items-center gap-2">
      {/* Modal de confirmación para remover de favoritos */}
      <Modal
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        placement="center"
        hideCloseButton={isLoading}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Remover de favoritos
              </ModalHeader>
              <ModalBody>
                <p className="text-default-700">
                  ¿Seguro que querés remover a{" "}
                  <span className="font-bold">{name}</span> de tu lista de
                  favoritos? Podés volver a marcarlo como favorito más adelante.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  type="button"
                  variant="bordered"
                  color="default"
                  isDisabled={isLoading}
                  onPress={() => onClose()}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="solid"
                  color="primary"
                  isDisabled={isLoading}
                  onPress={() => {
                    void handleToggleFavorite(false);
                    onClose();
                  }}
                  className="gap-2"
                >
                  {isLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <HeartOff size={18} />
                      <span>Remover de favoritos</span>
                    </>
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Botón favorito */}
      <Button
        type="button"
        color={localFavorite ? "primary" : "default"}
        variant="bordered"
        size="sm"
        isDisabled={isLoading}
        onPress={handleFavoriteClick}
        className="min-w-[190px] justify-start gap-2"
        aria-pressed={localFavorite}
        aria-label={
          localFavorite
            ? "Remover postulación de favoritos"
            : "Añadir postulación a favoritos"
        }
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          <Heart
            size={18}
            className={
              localFavorite
                ? "fill-custom-red text-custom-red"
                : "text-foreground"
            }
          />
        )}
        <span className="text-sm">
          {localFavorite ? "Remover de favoritos" : "Añadir a favoritos"}
        </span>
      </Button>

      {/* Botón descargar CV */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-2"
        isDisabled={isLoading}
        onPress={handleDownloadCv}
      >
        <Eye size={18} />
        <span className="text-sm">Ver CV</span>
      </Button>
    </div>
  );
}
