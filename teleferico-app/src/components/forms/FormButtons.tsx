"use client";

import { ButtonDos } from "@/components";
import { addToast, Spinner } from "@heroui/react";
import { useRouter } from "next/navigation";

interface Props {
  cancelRedirectRoute: string;
  isSubmitting: boolean;
  disableSubmitButton?: boolean;
  disableAction?: () => void;
}

export default function FormButtons(props: Props) {
  const {
    cancelRedirectRoute,
    isSubmitting = false,
    disableSubmitButton = false,
    disableAction = () => {
      addToast({
        title:
          "Faltan campos por completar y/o no son válidos. Por favor revíselos.",
        color: "danger",
        timeout: 2000,
      });
    },
  } = props;
  const router = useRouter();
  const isDisable = isSubmitting || disableSubmitButton;

  return (
    <div className="mx-auto flex flex-col-reverse justify-end gap-2 sm:flex-row">
      <ButtonDos
        intent="ghost"
        type="button"
        className="w-[159px]"
        onClick={() => router.push(cancelRedirectRoute)}
      >
        Cancelar
      </ButtonDos>
      <ButtonDos
        intent="solid"
        type={disableSubmitButton ? "button" : "submit"}
        className="w-[159px]"
        disabled={isDisable}
        onClick={() => {
          if (isDisable) disableAction();
        }}
      >
        {isSubmitting ? <Spinner size="sm" color="white" /> : "Guardar"}
      </ButtonDos>
    </div>
  );
}
