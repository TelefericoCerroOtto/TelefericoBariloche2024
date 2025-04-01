"use client";

import { BlockRendererClient, FormError } from "@/components";
import { useServiceState } from "@/hooks";
import type { GetServiceButtonResponse, ServiceStateValues } from "@/types";
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
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import { CableCar } from "lucide-react";
import { useMemo } from "react";

interface Props {
  content: GetServiceButtonResponse["data"][0]["jsonValue"];
}

export default function ServiceButtonClient(props: Props) {
  const { content } = props;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { serviceState, isError, isLoading } = useServiceState();

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
              <BlockRendererClient content={content.error as BlocksContent} />
            }
          />
        </div>
      </div>
    );

  return (
    <div className="sticky bottom-10 z-50 mt-10 flex w-full justify-end px-10">
      <button
        onClick={onOpen}
        className="flex h-auto gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2 hover:bg-foreground-200"
      >
        {isLoading ? (
          <Skeleton className="h-8 w-[400px]" />
        ) : (
          <>
            <CableCar
              size={50}
              className={
                colorStyles[serviceState?.data.state as ServiceStateValues]
              }
            />
            <div className="flex flex-col justify-between">
              <p className="text-start text-lg font-bold">
                {
                  content.modal.states.find(
                    (state) => state.state === serviceState?.data.state,
                  )?.stateLegend
                }
              </p>
              <p
                className={`text-start text-xs ${colorStyles[serviceState?.data.state as ServiceStateValues]}`}
              >
                {content.button.trigger}
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
                {
                  content.modal.states.find(
                    (state) => state.state === serviceState?.data.state,
                  )?.stateLegend
                }
              </ModalHeader>
              <ModalBody>
                <ul className="flex flex-col gap-3">
                  {content.modal.states
                    .sort((a, b) => a.order - b.order)
                    .map((state, idx) => (
                      <li key={idx}>
                        <strong
                          className={
                            colorStyles[state.state as ServiceStateValues]
                          }
                        >
                          {state.title}
                        </strong>{" "}
                        {state.stateDesc}
                      </li>
                    ))}
                </ul>
                <BlockRendererClient
                  content={content.modal.disclaimer as BlocksContent}
                  className="font-ligh text-sm"
                />
              </ModalBody>
              <ModalFooter>
                <Button className="bg-custom-red text-white" onPress={onClose}>
                  {content.button.close}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
