"use client";

import ButtonDos from "@/components/ui/ButtonDos";
import { useRouter } from "next/navigation";

interface Props {
  cancelRedirectRoute: string;
}

export default function FormButtons(props: Props) {
  const { cancelRedirectRoute } = props;
  const router = useRouter();

  return (
    <div className="flex justify-end gap-2">
      <ButtonDos
        intent="ghost"
        type="button"
        className="w-[159px]"
        onClick={() => router.push(cancelRedirectRoute)}
      >
        Cancelar
      </ButtonDos>
      <ButtonDos intent="solid" type="submit" className="w-[159px]">
        Guardar
      </ButtonDos>
    </div>
  );
}
