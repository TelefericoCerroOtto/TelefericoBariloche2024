"use client";

import { BlockRendererClient, FormError } from "@/components";
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
  service?: {
    state?: ServiceStateValues | string | null;
    isLoading?: boolean;
    isError?: boolean;
  };
}

const SERVICE_STATES: ServiceStateValues[] = [
  "normal",
  "conditional",
  "restricted",
  "suspended",
  "closed",
];

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

function resolveState(value?: string | null): ServiceStateValues {
  if (!value) {
    return "normal";
  }

  const normalized = value.toLowerCase() as ServiceStateValues;
  return SERVICE_STATES.includes(normalized) ? normalized : "normal";
}

export default function ServiceButtonClient(props: Props) {
  const { content, service } = props;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const modalId = useId();

  const isLoading = service?.isLoading ?? false;
  const isError = service?.isError ?? false;
  const currentStateKey = resolveState(service?.state ?? undefined);
  const styles = stateStyles[currentStateKey];

  const modalStates = useMemo(
    () =>
      [...content.modal.states].sort((left, right) => left.order - right.order),
    [content.modal.states],
  );

  const activeState =
    content.modal.states.find((state) =>
      state.state
        ? resolveState(state.state) === currentStateKey
        : false,
    ) ?? modalStates[0];

  if (isError) {
    return (
      <div className="w-full rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-md">
        <FormError
          message={<BlockRendererClient content={content.error as BlocksContent} />}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-3xl" />
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={isOpen}
          aria-controls={modalId}
          className={`group flex w-full items-center gap-5 rounded-3xl border px-6 py-5 text-left shadow-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary hover:-translate-y-0.5 hover:shadow-xl ${styles.border} ${styles.background}`}
        >
          <span
            className={`flex size-14 items-center justify-center rounded-2xl shadow-inner shadow-black/10 ${styles.iconBackground}`}
          >
            <CableCar className={`size-6 ${styles.iconColor}`} aria-hidden="true" />
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
      )}

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
                  {modalStates.map((state, index) => {
                    const itemState = resolveState(state.state);
                    const itemStyles = stateStyles[itemState];

                    return (
                      <li key={`${state.state}-${index}`} className="space-y-1">
                        <p className={`text-sm font-semibold md:text-base ${itemStyles.accentText}`}>
                          {state.title}
                        </p>
                        <p className="text-sm text-slate-600 md:text-base">
                          {state.stateDesc}
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
                  className="w-full rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
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
