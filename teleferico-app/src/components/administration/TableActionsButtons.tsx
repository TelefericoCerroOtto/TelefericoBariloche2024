"use client";

import { ButtonDos, CustomLink } from "@/components";
import type { Activity, BusTrip, Ticket, Zone } from "@/types";
import { ROUTE_HANDLERS } from "@/utils";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";

interface Props {
  item: Ticket | Activity | BusTrip | Zone;
  eraseModalTitle?: string;
  editPath: string;
  erasePath?: string;
  swrMutateKey?: string;
}

export default function TableActionsButtons(props: Props) {
  const { item, eraseModalTitle, editPath, erasePath, swrMutateKey } = props;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isErasing, setIsErasing] = useState(false);
  const { mutate } = useSWRConfig();

  const eraseElement = async (onClose: () => void) => {
    try {
      setIsErasing(true);

      const res = await fetch(
        `${ROUTE_HANDLERS.PROXY}${erasePath}/${item.documentId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        throw new Error("Error al eliminar el elemento");
      }

      alert("Elemento eliminado con éxito");
      onClose();
      mutate(swrMutateKey);
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al eliminar el elemento.");
    } finally {
      setIsErasing(false);
    }
  };

  const name =
    (item as Activity).activity_translations?.[0]?.name ||
    (item as Ticket).name ||
    (item as BusTrip).origin?.station_translations?.[0]?.name ||
    (item as Zone).zone_translations?.[0]?.name ||
    "este elemento";

  return (
    <div className="relative flex flex-row justify-center gap-2">
      <CustomLink
        size="sm"
        href={`${editPath}/${item.documentId}`}
        withButtonStyles
        intent="ghostBlack"
      >
        <Pencil size={20} />
        Editar
      </CustomLink>
      {erasePath && (
        <ButtonDos size="sm" intent="outlineRed" onClick={onOpen}>
          <Trash2 size={20} />
          Eliminar
        </ButtonDos>
      )}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {eraseModalTitle || "Eliminar elemento"}
              </ModalHeader>
              <ModalBody>
                <p>
                  ¿Está seguro que desea eliminar <strong>{name}</strong>?
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cerrar
                </Button>
                <Button
                  color="danger"
                  isLoading={isErasing}
                  onPress={() => eraseElement(onClose)}
                >
                  Eliminar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
