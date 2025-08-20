"use client";

import { ButtonDos, CustomLink } from "@/components";
import type { Ticket } from "@/types";
import { ROUTE_HANDLERS } from "@/utils/routes.const";
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
  ticket: Ticket;
  title: string;
  editPath: string;
  erasePath: string;
}

export default function ActionsButtons(props: Props) {
  const { ticket, title, editPath, erasePath } = props;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isErasing, setIsErasing] = useState(false);
  const { mutate } = useSWRConfig();

  const eraseElement = async (onClose: () => void) => {
    try {
      setIsErasing(true);

      const res = await fetch(
        `${ROUTE_HANDLERS.PROXY}${erasePath}/${ticket.documentId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        throw new Error("Error al eliminar el elemento");
      }

      alert("Elemento eliminado con éxito");
      onClose();
      mutate(`${ROUTE_HANDLERS.PROXY}${erasePath}`);
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al eliminar el elemento.");
    } finally {
      setIsErasing(false);
    }
  };

  return (
    <div className="relative flex flex-row justify-center gap-2">
      <CustomLink
        size="sm"
        href={`${editPath}/${ticket.id}`}
        withButtonStyles
        intent="ghostBlack"
      >
        <Pencil size={20} />
        Editar
      </CustomLink>
      <ButtonDos size="sm" intent="outlineRed" onClick={onOpen}>
        <Trash2 size={20} />
        Eliminar
      </ButtonDos>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
              <ModalBody>
                <p>
                  ¿Está seguro que desea eliminar <strong>{ticket.name}</strong>
                  ?
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
