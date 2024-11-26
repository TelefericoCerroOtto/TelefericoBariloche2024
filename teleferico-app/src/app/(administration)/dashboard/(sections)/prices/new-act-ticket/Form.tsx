"use client";

import FormButtons from "@/components/FormButtons";
import Input from "@/components/ui/Input";
import { activityTicketSchema } from "@/lib/schemas/forms";
import type { NewActivityTicketFormData } from "@/types/forms";
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

  const onSubmit = async (values: NewActivityTicketFormData) => {
    console.log("form values", values);
  };

  const { values, handleChange, handleSubmit } =
    useFormik<NewActivityTicketFormData>({
      initialValues: {
        activityNameEN: "hello world",
        activityNameES: "hola mundo",
        activityNamePT: "olá terra",
        price: 0,
        minAge: 0,
        season: "verano",
        requirementsES: "",
        requirementsEN: "",
        requirementsPT: "",
      },
      validationSchema: activityTicketSchema,
      onSubmit,
    });

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
                label="Nombre De La Actividad (ES)"
                name="activityNameES"
                id="activityNameES"
                value={values.activityNameES}
                onChange={handleChange}
              />
            );
          case lang.en as SharedSelection:
            return (
              <Input
                label="Nombre De La Actividad (EN)"
                name="activityNameEN"
                id="activityNameEN"
                value={values.activityNameEN}
                onChange={handleChange}
              />
            );
          case lang.pt as SharedSelection:
            <Input
              label="Nombre De La Actividad (PT)"
              name="activityNamePT"
              id="activityNamePT"
              value={values.activityNamePT}
              onChange={handleChange}
            />;
          default:
            return (
              <Input
                label="Nombre De La Actividad (ES)"
                name="activityNameES"
                id="activityNameES"
                value={values.activityNameES}
                onChange={handleChange}
              />
            );
        }
      })()}
      <Input
        label="Precio Por Persona"
        name="price"
        id="price"
        type="number"
        value={values.price}
        onChange={handleChange}
      />
      <Input
        label="Edad mínima"
        name="minAge"
        id="minAge"
        type="number"
        value={values.minAge}
        onChange={handleChange}
      />
      <Select
        name="season"
        id="season"
        variant="flat"
        radius="full"
        className="rounded-full"
        classNames={{
          trigger: "bg-accent hover:bg-accent border border-custom-border",
        }}
        label="Temporada"
        labelPlacement="outside"
        placeholder="Seleccione una temporada"
        value={values.season}
        onChange={handleChange}
      >
        <SelectItem key="verano">Verano</SelectItem>
        <SelectItem key="otoño">Otoño</SelectItem>
        <SelectItem key="invierno">Invierno</SelectItem>
        <SelectItem key="primavera">Primavera</SelectItem>
        <SelectItem key="allSeasons">Todo el año</SelectItem>
      </Select>
      {(() => {
        switch (selectValue.currentKey) {
          case lang.es as SharedSelection:
            return (
              <Input
                label="Requisitos (ES)"
                name="requirementsES"
                id="requirementsES"
                value={values.requirementsES}
                onChange={handleChange}
              />
            );
          case lang.en as SharedSelection:
            return (
              <Input
                label="Requisitos (EN)"
                name="requirementsEN"
                id="requirementsEN"
                value={values.requirementsEN}
                onChange={handleChange}
              />
            );
          case lang.pt as SharedSelection:
            return (
              <Input
                label="Requisitos (PT)"
                name="requirementsPT"
                id="requirementsPT"
                value={values.requirementsPT}
                onChange={handleChange}
              />
            );
          default:
            return (
              <Input
                label="Requisitos (ES)"
                name="requirementsPT"
                id="requirementsPT"
                value={values.requirementsPT}
                onChange={handleChange}
              />
            );
        }
      })()}
      <FormButtons cancelRedirectRoute={ADMIN_ROUTES.PRICES} />
    </form>
  );
}
