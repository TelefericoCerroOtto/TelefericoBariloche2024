"use client";

import { ButtonDos, CustomLink } from "@/components";
import { UserResponse } from "@/types";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  useDisclosure,
} from "@heroui/react";
import { CirclePause, CirclePlay, Pencil, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { blockAction, deleteAction } from "./actions";

interface Props {
  user: UserResponse;
}

type Actions = "delete" | "suspend" | "reactivate";

export default function ActionButtons({ user }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedAction, setSelectedAction] = useState<Actions>("delete");
  const [isLoading, setIsLoading] = useState(false);
  const { id, blocked, name, surname, username } = user;

  const generator = useCallback(
    function (
      onClose: () => void,
      action: (
        // eslint-disable-next-line no-unused-vars
        userId: number,
        // eslint-disable-next-line no-unused-vars
        blocked: boolean,
      ) => Promise<{ ok: boolean; data: unknown }>,
      message: string,
    ) {
      return async () => {
        setIsLoading(true);
        try {
          const res = await action(id, blocked);
          setIsLoading(false);
          if (res.ok) {
            onClose();
            alert(message);
            return;
          }
          alert(
            `Ocurrio un error inesperado ${JSON.stringify(res.data, null, 2)}`,
          );
        } catch (error) {
          console.log("action error", error);
          setIsLoading(false);
        }
      };
    },
    [blocked, id],
  );

  const modalContent: Record<
    Actions,
    {
      title: string;
      desc: string;
      btnTitle: string;
      // eslint-disable-next-line no-unused-vars
      action: (onClose: () => void) => () => void;
    }
  > = useMemo(
    () => ({
      delete: {
        title: `Borrar a ${name} ${surname}`,
        desc: "Esta accion borrará al usuario definitivamente. No tendra mas acceso al panel y se perderán todos sus datos.",
        btnTitle: "Borrar",
        action: (onClose) =>
          generator(onClose, deleteAction, `Usuario ${username} eliminado`),
      },
      suspend: {
        title: `Suspender a ${name} ${surname}`,
        desc: "Al pausar a un usuario, el mismo no podrá acceder al panel hasta que se le renueven los permisos. Su informacion no se pierde",
        btnTitle: "Suspender",
        action: (onClose) =>
          generator(onClose, blockAction, `Usuario ${username} suspendido`),
      },
      reactivate: {
        title: `Reactivar a ${name} ${surname}`,
        desc: "Al reactivar a un usuario, el mismo recuperara acceso al panel.",
        btnTitle: "Reactivar",
        action: (onClose) =>
          generator(onClose, blockAction, `Usuario ${username} reactivado`),
      },
    }),
    [generator, name, surname, username],
  );

  return (
    <div className="relative flex items-center gap-2">
      <CustomLink
        href={`${ADMIN_ROUTES.NEW_USER}/${id}`}
        withButtonStyles
        intent="ghostBlack"
      >
        <Pencil size={20} />
        <p>Editar</p>
      </CustomLink>
      {!blocked ? (
        <ButtonDos
          intent="ghostBlack"
          size="sm"
          onClick={() => {
            setSelectedAction("suspend");
            onOpen();
          }}
        >
          <CirclePause size={20} />
          <p>Pausar usuario</p>
        </ButtonDos>
      ) : (
        <ButtonDos
          intent="ghostBlack"
          size="sm"
          onClick={() => {
            setSelectedAction("reactivate");
            onOpen();
          }}
        >
          <CirclePlay size={20} />
          <p>Reanudar usuario</p>
        </ButtonDos>
      )}
      <ButtonDos
        intent="ghost"
        size="sm"
        onClick={() => {
          setSelectedAction("delete");
          onOpen();
        }}
      >
        <Trash2 size={20} />
        <p>Borrar</p>
      </ButtonDos>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        // TODO: The prop shouldCloseOnInteractOutside throws an error
        // "React does not recognize the `shouldCloseOnInteractOutside` prop on a DOM element.""
        shouldCloseOnInteractOutside={() => !isLoading}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {modalContent[selectedAction].title}
              </ModalHeader>
              <ModalBody>{modalContent[selectedAction].desc}</ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                  isDisabled={isLoading}
                >
                  Cerrar
                </Button>
                <Button
                  color="primary"
                  onPress={modalContent[selectedAction].action(onClose)}
                  isDisabled={isLoading}
                >
                  {isLoading ? (
                    <Spinner color="white" />
                  ) : (
                    modalContent[selectedAction].btnTitle
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
