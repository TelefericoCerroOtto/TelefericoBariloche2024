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
} from "@heroui/react";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import { CableCar, ChevronRight } from "lucide-react";
import { useId, useMemo } from "react";

interface Props {
  content: GetServiceButtonResponse["data"][0]["jsonValue"];
}

const stateStyles: Record<
  ServiceStateValues,
  {
    border: string;
    background: string;
    accentText: string;
    iconBackground: string;
    iconColor: string;
    badgeBackground: string;
    badgeText: string;
  }
> = {
  normal: {
    border: "border-emerald-200",
    background: "bg-white",
    accentText: "text-emerald-700",
    iconBackground: "bg-emerald-600",
    iconColor: "text-white",
    badgeBackground: "bg-emerald-100",
    badgeText: "text-emerald-700",
  },
  conditional: {
    border: "border-sky-200",
    background: "bg-sky-50",
    accentText: "text-sky-700",
    iconBackground: "bg-sky-600",
    iconColor: "text-white",
    badgeBackground: "bg-sky-200",
    badgeText: "text-sky-800",
  },
  restricted: {
    border: "border-amber-200",
    background: "bg-amber-50",
    accentText: "text-amber-700",
    iconBackground: "bg-amber-600",
    iconColor: "text-white",
    badgeBackground: "bg-amber-200",
    badgeText: "text-amber-800",
  },
  suspended: {
    border: "border-rose-200",
    background: "bg-rose-50",
    accentText: "text-rose-700",
    iconBackground: "bg-rose-600",
    iconColor: "text-white",
    badgeBackground: "bg-rose-200",
    badgeText: "text-rose-800",
  },
  closed: {
    border: "border-slate-300",
    background: "bg-slate-100",
    accentText: "text-slate-800",
    iconBackground: "bg-slate-700",
    iconColor: "text-white",
    badgeBackground: "bg-slate-300",
    badgeText: "text-slate-900",
  },
};

export default function ServiceButtonClient(props: Props) {
  const { content } = props;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { serviceState, isLoading, isError } = useServiceState();

  const modalId = useId();
  const stateKey = (serviceState?.data.state ?? "normal") as ServiceStateValues;

  const modalStates = useMemo(
    () => [...content.modal.items].sort((a, b) => a.order - b.order),
    [content.modal.items],
  );

  if (isLoading) return <Skeleton className="h-full w-full rounded-3xl" />;

  if (isError) {
    return (
      <div className="h-full w-full rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-md">
        <FormError
          message={
            <BlockRendererClient content={content.error as BlocksContent} />
          }
        />
      </div>
    );
  }

  const styles = stateStyles[stateKey];
  const activeState = content.modal.items.find(
    (item) => item.state === stateKey,
  );

  return (
    <div className="h-full w-full space-y-6">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={isOpen}
        aria-controls={modalId}
        className={`group flex h-full w-full items-center gap-5 rounded-3xl border px-6 py-5 text-left shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary ${styles.border} ${styles.background}`}
      >
        <span
          className={`flex size-14 items-center justify-center rounded-2xl shadow-inner shadow-black/10 ${styles.iconBackground}`}
        >
          <CableCar
            className={`size-6 ${styles.iconColor}`}
            aria-hidden="true"
          />
        </span>
        <span className="flex flex-1 flex-col gap-2">
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles.badgeBackground} ${styles.badgeText}`}
          >
            {activeState?.stateLegend ?? content.button.trigger}
          </span>
          <span className="text-lg font-semibold text-slate-900 md:text-xl">
            {content.button.trigger}
          </span>
          <span className={`text-sm md:text-base ${styles.accentText}`}>
            {activeState?.title}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className={`size-6 shrink-0 transition-transform duration-200 group-hover:translate-x-1 ${styles.accentText}`}
        />
      </button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        classNames={{
          base: "rounded-3xl",
          header: "pb-0",
          body: "pt-2",
        }}
      >
        <ModalContent id={modalId}>
          {(onClose) => (
            <>
              <ModalHeader
                className={`flex flex-col gap-1 text-lg font-semibold md:text-xl ${styles.accentText}`}
              >
                {activeState?.stateLegend ?? content.button.trigger}
              </ModalHeader>
              <ModalBody className="space-y-5">
                <ul className="space-y-4">
                  {modalStates.map((item, index) => {
                    const itemStyles = stateStyles[item.state];

                    return (
                      <li key={`${item.state}-${index}`} className="space-y-1">
                        <p
                          className={`text-sm font-semibold md:text-base ${itemStyles.accentText}`}
                        >
                          {item.title}
                        </p>
                        <p className="text-sm text-slate-600 md:text-base">
                          {item.stateDesc}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <BlockRendererClient
                  content={content.modal.disclaimer as BlocksContent}
                  className="text-xs text-slate-500 md:text-sm"
                />
              </ModalBody>
              <ModalFooter className="pt-0">
                <Button
                  className="w-full rounded-full bg-primary text-xl text-primary-foreground transition-opacity hover:opacity-90"
                  onPress={onClose}
                >
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
