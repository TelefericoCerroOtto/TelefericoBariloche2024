"use client";

import ButtonDos from "@/components/ui/ButtonDos";
import { Input } from "@nextui-org/react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function LoginForm() {
  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => setIsVisible(!isVisible);

  return (
    <form className="flex flex-col gap-4">
      <Input
        label={<p className="font-bold">Correo Electrónico</p>}
        variant="bordered"
        radius="lg"
        labelPlacement="outside"
        type="text"
        className="w-full"
      />
      <Input
        label={<p className="font-bold">Contraseña</p>}
        variant="bordered"
        radius="lg"
        labelPlacement="outside"
        endContent={
          <button
            className="focus:outline-none"
            type="button"
            onClick={toggleVisibility}
            aria-label="toggle password visibility"
          >
            {isVisible ? (
              <EyeOff className="pointer-events-none text-2xl text-default-400" />
            ) : (
              <Eye className="pointer-events-none text-2xl text-default-400" />
            )}
          </button>
        }
        type={isVisible ? "text" : "password"}
        className="w-full"
      />
      <ButtonDos type="button" fullWidth isLoading={isVisible}>
        Acceder
      </ButtonDos>
    </form>
  );
}
