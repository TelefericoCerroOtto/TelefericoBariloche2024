"use client";

import { BlockRendererClient, FormError } from "@/components";
import { useServiceState } from "@/hooks";
import type {
  GetServiceButtonResponse,
  Locales,
  ServiceStateValues,
} from "@/types";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
  Skeleton,
  useDisclosure,
} from "@heroui/react";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import { CableCar, ChevronRight } from "lucide-react";
import { useId, useMemo } from "react";

interface Props {
  content: GetServiceButtonResponse["data"][0]["jsonValue"];
  locale: Locales;
}

const uiCopy: Record<
  Locales,
  {
    loading: string;
    lastUpdated: string;
  }
> = {
  "es-AR": {
    loading: "Consultando estado actual del servicio",
    lastUpdated: "Última actualización",
  },
  en: {
    loading: "Checking current service status",
    lastUpdated: "Last updated",
  },
  pt: {
    loading: "Consultando estado atual do serviço",
    lastUpdated: "Última atualização",
  },
};

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

export default function ServiceStatusButtonClient(props: Props) {
  const { content, locale } = props;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { serviceState, isLoading, isError } = useServiceState();

  const modalId = useId();
  const copy = uiCopy[locale];
  const stateKey = (serviceState?.data.state ?? "normal") as ServiceStateValues;
  const formattedUpdatedAt = serviceState?.data.updatedAt
    ? new Date(serviceState.data.updatedAt).toLocaleString(locale, {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  const modalStates = useMemo(
    () => [...content.modal.items].sort((a, b) => a.order - b.order),
    [content.modal.items],
  );

  if (isLoading) {
    return (
      <div className="w-full" aria-live="polite" aria-busy="true">
        <div className="flex min-h-36 w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-md sm:min-h-40 sm:gap-5 sm:rounded-3xl sm:px-7 sm:py-6 lg:min-h-44 lg:px-8">
          <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100 shadow-inner shadow-black/5 sm:size-16 sm:rounded-2xl lg:size-[4.5rem]">
            <CableCar
              className="size-6 text-slate-400 sm:size-7 lg:size-8"
              aria-hidden="true"
            />
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-2.5">
            <span className="inline-flex w-fit items-center justify-center whitespace-normal rounded-full bg-slate-100 px-3 py-1 text-center text-sm font-semibold leading-tight tracking-wide text-slate-600 sm:px-3.5 sm:py-1.5 sm:text-base sm:leading-none">
              {copy.loading}
            </span>

            <Skeleton className="h-8 w-full max-w-sm rounded-full sm:h-9" />
            <Skeleton className="h-6 w-full max-w-56 rounded-full sm:h-7" />
          </span>

          <ChevronRight
            aria-hidden="true"
            className="size-6 shrink-0 text-slate-300 sm:size-7"
          />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full w-full rounded-3xl border border-rose-200 bg-rose-50 p-5 text-base text-rose-700 shadow-md">
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
    <div className="w-full space-y-4 sm:space-y-5">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={isOpen}
        aria-controls={modalId}
        className={`group relative flex min-h-36 w-full flex-col items-center gap-3 rounded-2xl border px-5 py-5 text-center shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary sm:min-h-40 sm:flex-row sm:items-center sm:gap-5 sm:rounded-3xl sm:px-7 sm:py-6 sm:text-left lg:min-h-44 lg:px-8 ${styles.border} ${styles.background}`}
      >
        {/* Icono teleferico */}
        <span
          className={`flex size-11 self-center items-center justify-center rounded-xl shadow-inner shadow-black/10 sm:size-16 sm:self-auto sm:rounded-2xl lg:size-[4.5rem] ${styles.iconBackground}`}
        >
          <CableCar
            className={`size-5 sm:size-7 lg:size-8 ${styles.iconColor}`}
            aria-hidden="true"
          />
        </span>

        {/* Textos informativos */}
        <span className="flex min-w-0 w-full flex-1 flex-col items-center gap-2 text-center sm:w-auto sm:items-start sm:gap-2.5 sm:text-left">
          <span
            className={`inline-flex w-fit items-center justify-center whitespace-normal rounded-full px-3 py-1 text-center text-sm font-semibold uppercase leading-tight tracking-wide sm:px-3.5 sm:py-1.5 sm:text-lg sm:leading-none ${styles.badgeBackground} ${styles.badgeText}`}
          >
            {activeState?.stateLegend ?? content.button.trigger}
          </span>

          <span className="text-lg font-semibold text-slate-900 sm:text-2xl md:text-3xl">
            {content.button.trigger}
          </span>

          <span
            className={`text-base sm:text-xl md:text-2xl ${styles.accentText}`}
          >
            {activeState?.title}
          </span>

          {formattedUpdatedAt ? (
            <span className="text-sm text-slate-500 sm:text-base">
              {copy.lastUpdated}: {formattedUpdatedAt}
            </span>
          ) : null}
        </span>

        {/* Flecha  */}
      </button>

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        scrollBehavior="inside"
        classNames={{
          base: "rounded-2xl sm:rounded-3xl",
          header: "pb-0",
          body: "px-0 pt-2",
        }}
      >
        <ModalContent id={modalId}>
          {(onClose) => (
            <>
              <ModalHeader
                className={`flex flex-col gap-1 text-lg font-semibold sm:text-xl md:text-2xl ${styles.accentText}`}
              >
                {activeState?.stateLegend ?? content.button.trigger}
              </ModalHeader>

              <ModalBody>
                <ScrollShadow className="max-h-[55dvh] space-y-4 px-6 sm:space-y-5">
                  <ul className="divide-y divide-slate-100">
                    {modalStates.map((item, index) => {
                      const itemStyles = stateStyles[item.state];

                      return (
                        <li key={`${item.state}-${index}`} className="py-3 first:pt-0 last:pb-0">
                          <p
                            className={`text-xl font-bold leading-tight sm:text-2xl ${itemStyles.accentText}`}
                          >
                            {item.title}
                          </p>
                          <p className="mt-1 text-lg leading-relaxed text-slate-700 sm:text-xl">
                            {item.stateDesc}
                          </p>
                        </li>
                      );
                    })}
                  </ul>

                  <BlockRendererClient
                    content={content.modal.disclaimer as BlocksContent}
                    proseSize="base"
                    className="text-slate-500"
                  />
                </ScrollShadow>
              </ModalBody>

              <ModalFooter className="pt-0">
                <Button
                  className="w-full rounded-full bg-primary py-2.5 text-lg font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:py-3 sm:text-xl md:text-2xl"
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
