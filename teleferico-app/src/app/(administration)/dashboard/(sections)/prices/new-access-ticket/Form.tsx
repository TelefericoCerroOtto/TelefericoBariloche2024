"use client";

import { FormButtons, Input } from "@/components";
import { accessTicketSchema } from "@/lib/schemas/forms";
import type { NewAccessTicketFormData } from "@/types/forms";
import { lang } from "@/utils/lang.const";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import { Select, SelectItem, type SharedSelection } from "@nextui-org/react";
import { useFormik } from "formik";
import { Languages } from "lucide-react";
import { useState } from "react";

export default function Form() {
  const [selectValue, setSelectValue] = useState<SharedSelection>(
    new Set([lang.es]),
  );

  const onSubmit = async (values: NewAccessTicketFormData) => {
    console.log("form values", values);
  };

  const { values, handleChange, handleSubmit, errors } =
    useFormik<NewAccessTicketFormData>({
      initialValues: {
        accessNameEN: "hello world",
        accessNameES: "hola mundo",
        accessNamePT: "olá terra",
        price: 0,
        elevationMethod: "",
      },
      validationSchema: accessTicketSchema,
      onSubmit,
    });

  console.log("errors", errors);

  return (
    <form
      className="flex flex-col gap-5 overflow-scroll"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-3">
        <Languages />
        <p>Editando en:</p>
        <Select
          variant="underlined"
          className="w-[120px]"
          size="sm"
          selectedKeys={selectValue}
          onSelectionChange={setSelectValue}
        >
          <SelectItem key={lang.es}>Español</SelectItem>
          <SelectItem key={lang.en}>Inglés</SelectItem>
          <SelectItem key={lang.pt}>Portugués</SelectItem>
        </Select>
      </div>

      {(() => {
        switch (selectValue.currentKey) {
          case lang.es as SharedSelection:
            return (
              <Input
                label="Tipo De Ticket (ES)"
                name="accessNameES"
                id="accessNameES"
                value={values.accessNameES}
                onChange={handleChange}
              />
            );
          case lang.en as SharedSelection:
            return (
              <Input
                label="Tipo De Ticket (EN)"
                name="accessNameEN"
                id="accessNameEN"
                value={values.accessNameEN}
                onChange={handleChange}
              />
            );
          case lang.pt as SharedSelection:
            return (
              <Input
                label="Tipo De Ticket (PT)"
                name="accessNamePT"
                id="accessNamePT"
                value={values.accessNamePT}
                onChange={handleChange}
              />
            );
          default:
            return (
              <Input
                label="Tipo De Ticket (ES)"
                name="accessNameES"
                id="accessNameES"
                value={values.accessNameES}
                onChange={handleChange}
              />
            );
        }
      })()}
      <Select
        name="elevationMethod"
        id="elevationMethod"
        variant="flat"
        radius="full"
        className="rounded-full"
        classNames={{
          trigger: "bg-accent hover:bg-accent border border-custom-border",
        }}
        label="Medio De Elevación"
        labelPlacement="outside"
        placeholder="Seleccionar"
        value={values.elevationMethod}
        onChange={handleChange}
      >
        <SelectItem key="teleferico">Teleferico</SelectItem>
        <SelectItem key="camino">Camino y funicular</SelectItem>
      </Select>
      <Input
        label="Precio Por Persona"
        name="price"
        id="price"
        type="number"
        value={values.price}
        onChange={handleChange}
      />
      <FormButtons cancelRedirectRoute={ADMIN_ROUTES.PRICES} />
    </form>
  );
}
