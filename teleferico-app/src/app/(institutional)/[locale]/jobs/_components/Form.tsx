"use client";

import { sectorOptions } from "@/app/(administration)/dashboard/(sections)/recruitment/_components/data";
import { ButtonDos, Input } from "@/components";
import { selectInputStyles } from "@/utils/styles";
import { Select, SelectItem } from "@nextui-org/react";
// import { Input as InputNextui } from "@nextui-org/react";

export default function Form() {
  return (
    <form className="grid flex-grow grid-cols-1 gap-4 lg:grid-cols-2">
      <Input
        id="firstName"
        name="firstName"
        label="Nombre"
        placeholder="Nombre"
      />
      <Input
        id="lastName"
        name="lastName"
        label="Apellido"
        placeholder="Apellido"
      />
      <Select
        {...selectInputStyles}
        name="genre"
        id="genre"
        label="Genero"
        placeholder="Seleccionar"
      >
        <SelectItem key="male">Masculino</SelectItem>
        <SelectItem key="female">Femenino</SelectItem>
        <SelectItem key="other">Otro</SelectItem>
      </Select>
      {/* <InputNextui
        id="age"
        name="age"
        label="Edad"
        placeholder="Edad"
        type="number"
        labelPlacement="outside"
        className="rounded-full border"
        onValueChange={(e) => {
          let value = parseInt(e);
          if (value < 0) {
            value = 0;
          }
          setFieldValue("campNo", value);
        }}
      /> */}
      <Input
        id="age"
        name="age"
        label="Edad"
        placeholder="Edad"
        type="number"
      />
      <Input
        id="email"
        name="email"
        label="Email"
        placeholder="Email"
        type="email"
      />
      <Select
        {...selectInputStyles}
        labelPlacement="outside"
        name="sector"
        id="sector"
        label="Sector de Postulación"
        placeholder="Seleccionar"
        items={sectorOptions}
        // value={values.sector}
        // onChange={(evt) => setFieldValue("sector", evt.target.value)}
      >
        {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
      </Select>
      <Input
        id="campNo"
        name="campNo"
        label="Código de Campaña (Opcional)"
        placeholder="Código de Campaña (Opcional)"
        type="number"
      />
      <Input
        id="cv"
        name="cv"
        label="Agrega tu CV"
        placeholder="Seleccionar archivo"
        type="file"
      />
      <ButtonDos type="submit" className="w-[90px]">
        Enviar
      </ButtonDos>
    </form>
  );
}
