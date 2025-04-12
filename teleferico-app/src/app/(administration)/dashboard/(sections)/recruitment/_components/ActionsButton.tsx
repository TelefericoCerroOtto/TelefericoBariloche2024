"use client";

import { ButtonDos } from "@/components";
import { Spinner } from "@nextui-org/react";
import { Download, Heart } from "lucide-react";
import { useState } from "react";

interface Props {
  id?: string;
  isFavorite: boolean;
}

export default function ActionsButton(props: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const { isFavorite } = props;

  return (
    <div className="relative flex items-center gap-2">
      <ButtonDos
        intent="ghostBlack"
        disabled={isLoading}
        onClick={() => setIsLoading(!isLoading)}
        className="w-[220px] justify-start gap-2"
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : isFavorite ? (
          <Heart size={20} fill="" />
        ) : (
          <Heart size={20} />
        )}
        {isFavorite ? <p>Remover de Favoritos</p> : <p>Añadir A Favoritos</p>}
      </ButtonDos>
      <ButtonDos intent="ghost" size="sm">
        <Download size={20} />
        <p>Descargar CV</p>
      </ButtonDos>
    </div>
  );
}
