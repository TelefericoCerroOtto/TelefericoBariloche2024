"use client";

import { FormButtons } from "@/components";
import { accessTicketSchema } from "@/lib/schemas/forms";
import type { NewAccessTicketFormData } from "@/types/forms";
import { lang } from "@/utils/lang.const";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import {
  Input,
  NumberInput,
  Select,
  SelectItem,
  type SharedSelection,
} from "@heroui/react";
import { useFormik } from "formik";
import { Languages } from "lucide-react";
import { useState } from "react";
import { newTicketAction } from "./actions";

export default function Form() {
  const [selectValue, setSelectValue] = useState<SharedSelection>(
    new Set([lang.es]),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: NewAccessTicketFormData) => {
    try {
      setIsSubmitting(true);
      const res = await newTicketAction(values);
      setIsSubmitting(false);
      if (res.success) return alert("Nueva tarifa creada exitosamente");
      console.log(res.message);
      return alert("Ocurrió un error intesperado al crear la tarifa");
    } catch (error) {
      setIsSubmitting(false);
      console.log("new access ticket submit error: ", error);
      alert("Ocurrió un error al enviar el formulario");
    }
  };

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldValue,
    handleSubmit,
  } = useFormik<NewAccessTicketFormData>({
    initialValues: {
      accessName_en: "",
      "accessName_es-AR": "",
      accessName_pt: "",
      price: 0,
      liftingMean: "cablecar",
    },
    validationSchema: accessTicketSchema,
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
          disallowEmptySelection
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
                label="Nombre de la tarifa (Español)"
                labelPlacement="outside"
                placeholder="Ej.: Ticket mayor"
                name="accessName_es-AR"
                id="accessName_es-AR"
                value={values["accessName_es-AR"]}
                onChange={handleChange}
                onBlur={handleBlur}
                errorMessage={errors["accessName_es-AR"]}
                isInvalid={
                  !!errors["accessName_es-AR"] && touched["accessName_es-AR"]
                }
              />
            );
          case lang.en as SharedSelection:
            return (
              <Input
                label="Nombre de la tarifa (Inglés)"
                labelPlacement="outside"
                placeholder="Ej.: Adult ticket"
                name="accessName_en"
                id="accessName_en"
                value={values.accessName_en}
                onChange={handleChange}
                onBlur={handleBlur}
                errorMessage={errors.accessName_en}
                isInvalid={!!errors.accessName_en && touched.accessName_en}
              />
            );
          case lang.pt as SharedSelection:
            return (
              <Input
                label="Nombre de la tarifa (Portugués)"
                labelPlacement="outside"
                placeholder="Ej.: Bilhete sênior"
                name="accessName_pt"
                id="accessName_pt"
                value={values.accessName_pt}
                onChange={handleChange}
                onBlur={handleBlur}
                errorMessage={errors.accessName_pt}
                isInvalid={!!errors.accessName_pt && touched.accessName_pt}
              />
            );
          default:
            return (
              <Input
                label="Nombre de la tarifa (Español)"
                labelPlacement="outside"
                placeholder="Ej.: Ticket mayor"
                name="accessName_es-AR"
                id="accessName_es-AR"
                value={values["accessName_es-AR"]}
                onChange={handleChange}
                onBlur={handleBlur}
                errorMessage={errors["accessName_es-AR"]}
                isInvalid={
                  !!errors["accessName_es-AR"] && touched["accessName_es-AR"]
                }
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
        defaultSelectedKeys={new Set(["cablecar"])}
        value={values.liftingMean}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.liftingMean}
        isInvalid={!!errors.liftingMean && touched.liftingMean}
        disallowEmptySelection
      >
        <SelectItem key="cablecar">Teleférico</SelectItem>
        <SelectItem key="road&funicular">Camino y funicular</SelectItem>
      </Select>

      <NumberInput
        labelPlacement="outside"
        label="Precio Por Persona"
        placeholder="Ej.: 25000"
        name="price"
        id="price"
        type="number"
        hideStepper
        value={values.price}
        onChange={(value) => {
          if (typeof value === "number") {
            console.log("Number input value: ", value);
            setFieldValue("price", value);
          }
        }}
        onBlur={handleBlur}
        errorMessage={errors.price}
        isInvalid={!!errors.price && touched.price}
      />

      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.PRICES}
        disableSubmitButton={
          isSubmitting ||
          Object.keys(errors).length > 0 ||
          values.accessName_en === ""
        }
      />
    </form>
  );
}
