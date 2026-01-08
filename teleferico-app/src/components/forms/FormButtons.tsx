"use client";

import { addToast, Button, Spinner } from "@heroui/react";
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
  const isDisabled = isSubmitting || disableSubmitButton;

  return (
    <div className="mx-auto flex flex-col-reverse justify-end gap-2 sm:flex-row">
      <Button
        variant="ghost"
        type="button"
        onPress={() => router.push(cancelRedirectRoute)}
        size="lg"
        radius="full"
      >
        Cancelar
      </Button>
      <Button
        variant="solid"
        color="primary"
        size="lg"
        radius="full"
        type={disableSubmitButton ? "button" : "submit"}
        isDisabled={isDisabled}
        onPress={() => {
          if (isDisabled) disableAction();
        }}
      >
        {isSubmitting ? <Spinner size="sm" color="white" /> : "Guardar"}
      </Button>
    </div>
  );
}
