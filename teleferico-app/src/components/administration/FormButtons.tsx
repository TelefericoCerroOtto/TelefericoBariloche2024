"use client";

import { ButtonDos } from "@/components";
import { Spinner } from "@nextui-org/spinner";
import { useRouter } from "next/navigation";

interface Props {
  cancelRedirectRoute: string;
  isSubmitting: boolean;
  disableSubmitButton?: boolean;
}

export default function FormButtons(props: Props) {
  const {
    cancelRedirectRoute,
    isSubmitting = false,
    disableSubmitButton = false,
  } = props;
  const router = useRouter();

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
        disabled={disableSubmitButton || isSubmitting}
      >
        {isSubmitting ? <Spinner size="sm" color="white" /> : "Guardar"}
      </ButtonDos>
    </div>
  );
}
