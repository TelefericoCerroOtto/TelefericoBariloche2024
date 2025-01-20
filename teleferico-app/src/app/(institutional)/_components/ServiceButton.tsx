"use client";

import { ROUTES } from "@/utils/routes.const";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from "@nextui-org/react";
import { CableCar } from "lucide-react";
import Link from "next/link";

export default function ServiceButton() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <div className="sticky bottom-10 mt-10 flex w-full justify-end px-10">
      <button
        onClick={onOpen}
        className="flex h-auto gap-2 rounded-2xl bg-white px-4 py-2 hover:bg-foreground-200"
      >
        <CableCar size={50} color="green" />
        <div className="flex flex-col justify-between">
          <p className="text-start text-lg font-bold">
            El medio de elevacion opera normalmente
          </p>
          <p className="text-start text-xs text-green-700">Ver mas detalles</p>
        </div>
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
