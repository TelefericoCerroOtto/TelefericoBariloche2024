"use client";

import { useAppAlert } from "@/hooks";
import { deleteItemAction } from "./actions";
import type {
  Activity,
  BusTrip,
  Faq,
  GetNewsResponse,
  NewsEntity,
  Ticket,
  Zone,
} from "@/types";
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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSWRConfig } from "swr";

type NewsListItem = GetNewsResponse["data"][number];

interface Props {
  item: Ticket | Activity | BusTrip | Zone | NewsEntity | NewsListItem | Faq;
  eraseModalTitle?: string;
  editPath: string;
  erasePath?: string;
  swrMutateKey?: string;
  disabled?: boolean;
}

export default function TableActionsButtons(props: Props) {
  const {
    item,
    eraseModalTitle,
    editPath,
    erasePath = "",
    swrMutateKey,
    disabled = false,
  } = props;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isErasing, setIsErasing] = useState(false);
  const { mutate } = useSWRConfig();
  const { showAlert } = useAppAlert();
  const router = useRouter();

  const eraseElement = async (onClose: () => void) => {
    try {
      setIsErasing(true);

      const res = await deleteItemAction(erasePath, item.documentId);

      if (!res.success) {
        console.log("Delete item in table failed.", res.data);

        showAlert({
          title: "Error",
          message: "Ocurrió un error al eliminar el elemento.",
          variant: "danger",
        });
        return;
      }

      showAlert({
        title: "Éxito",
        message: "Elemento eliminado con éxito",
        variant: "success",
      });
      onClose();
      mutate(swrMutateKey);
    } catch (err) {
      console.error(err);
      showAlert({
        title: "Error",
        message: "Ocurrió un error al eliminar el elemento.",
        variant: "danger",
      });
    } finally {
      setIsErasing(false);
    }
  };

  const name =
    (item as Activity).activity_translations?.[0]?.name ||
    (item as Ticket).name ||
    (item as BusTrip).origin?.station_translations?.[0]?.name ||
    (item as Zone).zone_translations?.[0]?.name ||
    (item as NewsEntity).title ||
    (item as NewsListItem).title ||
    "este elemento";

  const href = `${editPath}/${item.documentId}`;

  return (
    <div className="relative flex flex-row justify-center gap-2">
      <Button
        isDisabled={disabled}
        variant="ghost"
        size="md"
        startContent={<Pencil size={20} />}
        onPress={() => {
          if (disabled) return;
          router.push(href);
        }}
      >
        Editar
      </Button>
      {erasePath && (
        <Button
          size="md"
          startContent={<Trash2 size={20} />}
          variant="ghost"
          color="primary"
          onPress={onOpen}
          isDisabled={disabled}
        >
          Eliminar
        </Button>
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
