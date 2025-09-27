"use client";

import { BlockRendererClient, FormError } from "@/components";
import { useServiceState } from "@/hooks";
import type { GetServiceButtonResponse, ServiceStateValues } from "@/types";
import { cn } from "@/utils";
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
import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  forwardRef,
  useMemo,
  type Ref,
  type ReactNode,
} from "react";

interface Props {
  content: GetServiceButtonResponse["data"][0]["jsonValue"];
}

const stateColorStyles: Record<ServiceStateValues, string> = {
  normal: "text-custom-green",
  conditional: "text-custom-blue",
  restricted: "text-custom-orange",
  suspended: "text-custom-red",
  closed: "text-black",
};

const stateAccentStyles: Record<ServiceStateValues, string> = {
  normal: "border-[rgba(4,80,9,0.18)] bg-[rgba(4,80,9,0.08)]",
  conditional: "border-[rgba(11,71,149,0.2)] bg-[rgba(11,71,149,0.08)]",
  restricted: "border-[rgba(206,103,0,0.2)] bg-[rgba(206,103,0,0.1)]",
  suspended: "border-[rgba(159,18,18,0.22)] bg-[rgba(159,18,18,0.08)]",
  closed: "border-[rgba(0,0,0,0.18)] bg-[rgba(0,0,0,0.08)]",
};

const baseButtonStyles =
  "group relative flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border/40 bg-card/95 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 disabled:pointer-events-none disabled:opacity-60";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface BaseServiceButtonProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  highlighted?: boolean;
  variant?: Variant;
  size?: Size;
  className?: string;
  iconWrapperClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

type ServiceButtonButtonProps = BaseServiceButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "type"> & {
    href?: undefined;
  };

type ServiceButtonAnchorProps = BaseServiceButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & {
    href: string;
  };

type ServiceButtonActionProps =
  | ServiceButtonButtonProps
  | ServiceButtonAnchorProps;

const ServiceButtonAction = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ServiceButtonActionProps
>((props, ref) => {
  const {
    title,
    description,
    icon,
    badge,
    highlighted,
    variant = "primary",
    size = "md",
    className,
    iconWrapperClassName,
    titleClassName,
    descriptionClassName,
    href,
    ...rest
  } = props as ServiceButtonActionProps & { href?: string };

  const sizeClasses: Record<Size, string> = {
    sm: "p-3 md:p-4",
    md: "p-4 md:p-5",
    lg: "p-5 md:p-6",
  };

  const variantClasses: Record<Variant, string> = {
    primary: "bg-card/95",
    secondary: "bg-secondary/60 text-secondary-foreground",
    ghost: "bg-transparent border-border/60",
  };
  const sharedClassName = cn(
    baseButtonStyles,
    sizeClasses[size],
    variantClasses[variant],
    highlighted && "border-primary/50 bg-primary/10",
    "md:flex-row md:items-center md:justify-between",
    className,
  );

  const contentFragment = (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
        {icon ? (
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-foreground/5 text-primary transition-colors md:size-14",
              iconWrapperClassName,
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "text-base font-semibold leading-tight md:text-lg",
                titleClassName,
              )}
            >
              {title}
            </p>
            {badge ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? (
            <p
              className={cn(
                "text-sm text-muted-foreground md:text-base",
                descriptionClassName,
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <ChevronRight
        aria-hidden="true"
        className="hidden size-5 shrink-0 text-muted-foreground transition-transform duration-200 md:block md:group-hover:translate-x-1"
      />
    </>
  );

  if (href) {
    const linkProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        className={sharedClassName}
        {...linkProps}
      >
        {contentFragment}
      </a>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type={buttonProps.type ?? "button"}
      className={sharedClassName}
      {...buttonProps}
    >
      {contentFragment}
    </button>
  );
});

ServiceButtonAction.displayName = "ServiceButtonAction";

export default function ServiceButtonClient(props: Props) {
  const { content } = props;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { serviceState, isError, isLoading } = useServiceState();

  const currentState = useMemo(() => {
    return content.modal.states.find(
      (state) => state.state === serviceState?.data.state,
    );
  }, [content.modal.states, serviceState?.data.state]);

  if (isError) {
    console.log("get service state error", isError);
    return (
      <div className="sticky bottom-6 z-50 mt-10 flex w-full justify-end px-4 sm:px-6">
        <div className="max-w-md rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FormError
            message={
              <BlockRendererClient content={content.error as BlocksContent} />
            }
          />
        </div>
      </div>
    );
  }

  const stateKey = (serviceState?.data.state ?? "normal") as ServiceStateValues;
  const stateColor = stateColorStyles[stateKey];

  return (
    <div className="pointer-events-none sticky bottom-6 z-50 mt-10 flex w-full justify-end px-4 sm:px-6">
      <div className="pointer-events-auto w-full max-w-md">
        {isLoading ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : (
          <ServiceButtonAction
            onClick={onOpen}
            aria-expanded={isOpen}
            aria-label={content.button.trigger}
            title={currentState?.stateLegend ?? content.button.trigger}
            description={content.button.trigger}
            icon={<CableCar size={24} className={cn("text-current", stateColor)} />}
            iconWrapperClassName={cn(
              "border border-border/40",
              stateAccentStyles[stateKey],
              stateColor,
            )}
            titleClassName={stateColor}
            variant="primary"
            size="md"
            highlighted={stateKey !== "normal"}
          />
        )}
      </div>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        classNames={{
          base: "rounded-2xl",
          header: "pb-0",
          body: "pt-2",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader
                className={cn(
                  "flex flex-col gap-1 text-lg font-semibold",
                  stateColor,
                )}
              >
                {currentState?.stateLegend ?? content.button.trigger}
              </ModalHeader>
              <ModalBody className="space-y-4">
                <ul className="space-y-3">
                  {content.modal.states
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((state, idx) => (
                      <li key={idx} className="text-sm leading-relaxed md:text-base">
                        <strong
                          className={cn(
                            "font-semibold",
                            stateColorStyles[state.state as ServiceStateValues],
                          )}
                        >
                          {state.title}
                        </strong>{" "}
                        {state.stateDesc}
                      </li>
                    ))}
                </ul>
                <BlockRendererClient
                  content={content.modal.disclaimer as BlocksContent}
                  className="text-sm text-muted-foreground"
                />
              </ModalBody>
              <ModalFooter className="pt-0">
                <Button
                  className="w-full rounded-full bg-primary text-primary-foreground hover:opacity-90"
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
