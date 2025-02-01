"use client";

import { FormError } from "@/components";
import { useServiceState } from "@/hooks";
import type { ServiceStateModal, ServiceStateValues } from "@/types";
import { ROUTES } from "@/utils/routes.const";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Skeleton,
  useDisclosure,
} from "@nextui-org/react";
import { CableCar } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface Props {
  content: ServiceStateModal;
}

export default function ServiceButton(props: Props) {
  const { content } = props;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { state, isError, isLoading } = useServiceState();

  const colorStyles = useMemo<Record<ServiceStateValues, string>>(
    () => ({
      normal: "text-custom-green",
      conditional: "text-custom-blue",
      restricted: "text-custom-orange",
      suspended: "text-custom-red",
      closed: "text-black",
    }),
    [],
  );

  if (isError)
    return (
      <div className="sticky bottom-10 z-50 mt-10 flex w-full justify-end px-10">
        <div className="rounded-md bg-red-100 p-2">
          <FormError
            message={
              <p>
                Ocurrió un error al recuperar la informacion del estado del
                servicio.{" "}
                <Link href={ROUTES.CONTACT} className="text-red-500 underline">
                  Ir a contacto
                </Link>
              </p>
            }
          />
        </div>
      </div>
    );

  let stateTitle;
  if (content && !isLoading) {
    stateTitle = content.stateList.filter(
      (item) => item.state.name === state?.data.state,
    )[0].title;
  }

  return (
    <div className="sticky bottom-10 z-50 mt-10 flex w-full justify-end px-10">
      <button
        onClick={onOpen}
        className="flex h-auto gap-2 rounded-2xl bg-white px-4 py-2 hover:bg-foreground-200"
      >
        {isLoading ? (
          <Skeleton className="h-8 w-[400px]" />
        ) : (
          <>
            <CableCar
              size={50}
              className={colorStyles[state?.data.state as ServiceStateValues]}
            />
            <div className="flex flex-col justify-between">
              <p className="text-start text-lg font-bold">{stateTitle}</p>
              <p
                className={`text-start text-xs ${colorStyles[state?.data.state as ServiceStateValues]}`}
              >
                Ver mas detalles
              </p>
            </div>
          </>
        )}
      </button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                El medio de elevacion opera normalmente
              </ModalHeader>
              <ModalBody>
                <ul className="flex flex-col gap-3">
                  <li>
                    <span className="font-bold text-custom-green">
                      Servicio Normal:
                    </span>{" "}
                    Ascenso permitido a todos los pasajeros sin restricciones.
                  </li>
                  <li>
                    <span className="font-bold text-custom-blue">
                      Servicio Condicional:
                    </span>{" "}
                    Podrían presentarse demoras por factores climáticos.
                  </li>
                  <li>
                    <span className="font-bold text-custom-orange">
                      Servicio Condicional con Restricciones:
                    </span>{" "}
                    Es muy probable que haya demoras o la eventual suspension
                    del medio. Por esta razon el ascenso esta limitado para
                    grupos como mujeres embarazadas, personas con movilidad
                    reducida, adultos mayores, etc. Si vas a subir es preferible
                    que no tengas ningun otro compromiso.
                  </li>
                  <li>
                    <span className="font-bold text-custom-red">
                      Servicio Suspendido:
                    </span>{" "}
                    El ascenso esta por gondola esta detenido, es decir que no
                    se puede subir.
                  </li>
                </ul>
                <p className="text-sm font-light">
                  Las condiciones del servicio de ascenso pueden variar debido a
                  factores climáticos. Te dejamos la información necesaria para
                  que puedas planificar tu visita de forma segura y sin
                  inconvenientes. Para mas informacion podes revisar la seccion
                  de{" "}
                  <Link
                    href={ROUTES.FAQS}
                    className="text-custom-red hover:underline"
                  >
                    FAQS
                  </Link>{" "}
                  o nuestro{" "}
                  <Link
                    href={ROUTES.POLICIES}
                    className="text-custom-red hover:underline"
                  >
                    Reglamento
                  </Link>
                </p>
              </ModalBody>
              <ModalFooter>
                <Button className="bg-custom-red text-white" onPress={onClose}>
                  Entendido
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
