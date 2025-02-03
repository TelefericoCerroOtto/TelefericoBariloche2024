"use client";

import { ButtonDos, Input } from "@/components";
import { Textarea } from "@nextui-org/react";

export default function Form() {
  return (
    <form className="grid flex-grow grid-cols-1 gap-4">
      <Input id="name" name="name" label="Nombre" placeholder="Nombre" />
      <Input
        id="email"
        name="email"
        label="Email"
        placeholder="Email"
        type="email"
      />
      <Textarea
        className=""
        label="Consulta"
        placeholder="Ingresa tu consulta"
        labelPlacement="outside"
      />
      <ButtonDos type="submit" className="w-[90px]">
        Enviar
      </ButtonDos>
    </form>
  );
}
