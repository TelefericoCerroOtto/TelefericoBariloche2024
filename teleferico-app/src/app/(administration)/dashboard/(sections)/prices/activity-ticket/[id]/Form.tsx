"use client";

import {
  FormButtons,
  FormLocaleSelector,
  LocaleInputField,
  LocaleTextareaField,
} from "@/components";
import { useFormLocaleSelector } from "@/hooks";
import { updateActivitySchema } from "@/lib/schemas/forms";
import type { UpdateActivityFormData } from "@/types";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import { NumberInput, Select, SelectItem } from "@heroui/react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { seasonOptions } from "../data";
import { updateActivityAction } from "./actions";

interface Props {
  initialValues: UpdateActivityFormData;
}

export default function Form(props: Props) {
  const { initialValues } = props;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();

  const onSubmit = async (values: UpdateActivityFormData) => {
    setIsSubmitting(true);
    try {
      const res = await updateActivityAction(values);
      if (res.success) {
        alert("Actividad actualizada exitosamente");
        return router.push(ADMIN_ROUTES.PRICES);
      }
      setIsSubmitting(false);
      console.log(res.message);
      return alert("Ocurrió un error inesperado al actualizar la actividad");
    } catch (error) {
      setIsSubmitting(false);
      console.log("update activity submit error: ", error);
      alert("Ocurrió un error al enviar el formulario");
    }
  };

  const {
    values,
    errors,
    touched,
    dirty,
    handleChange,
    handleBlur,
    setFieldValue,
    handleSubmit,
  } = useFormik<UpdateActivityFormData>({
    initialValues,
    validationSchema: updateActivitySchema,
    onSubmit,
  });

  console.log("errors: ", errors);

  return (
    <form
      className="flex flex-col gap-5 overflow-scroll"
      onSubmit={handleSubmit}
    >
      <FormLocaleSelector
        selectedKeys={selectedKeys}
        handleSelectionChange={handleSelectionChange}
      />
      <LocaleInputField
        config={{
          "es-AR": {
            label: "Nombre De La Actividad (Español)",
            name: "activityName_es-AR",
            placeholder: "Ej.: Trineos pista para niños",
          },
          en: {
            label: "Nombre De La Actividad (Inglés)",
            name: "activityName_en",
            placeholder: "Ej.: Sledges kids track",
          },
          pt: {
            label: "Nombre De La Actividad (Portugués)",
            name: "activityName_pt",
            placeholder: "Ej.: Skibunda pista para crianças",
          },
        }}
        isRequired
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />
      <LocaleTextareaField
        config={{
          "es-AR": {
            label: "Descripción De La Actividad (Español)",
            name: "description_es-AR",
            placeholder:
              "Ej.: Es una pista de trineos de 150 metros de largo...",
          },
          en: {
            label: "Descripción De La Actividad (Inglés)",
            name: "description_en",
            placeholder: "Ej.: It's a 150-meter-long sled track...",
          },
          pt: {
            label: "Descripción De La Actividad (Portugués)",
            name: "description_pt",
            placeholder:
              "Ej.: É uma pista de trenó de 150 metros de comprimento...",
          },
        }}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />
      <LocaleInputField
        config={{
          "es-AR": {
            label: "Requisitos (Español)",
            name: "requirements_es-AR",
            placeholder: "Ej.: Mayores de 5 años y menores de 12 años",
          },
          en: {
            label: "Requisitos (Inglés)",
            name: "requirements_en",
            placeholder: "Ej.: Ages over 5 and under 12 years",
          },
          pt: {
            label: "Requisitos (Portugués)",
            name: "requirements_pt",
            placeholder: "Ej.: Maiores de 5 anos e menores de 12 anos",
          },
        }}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />
      <NumberInput
        label="Precio Por Persona"
        labelPlacement="outside"
        name="price"
        id="price"
        type="number"
        isRequired
        hideStepper
        value={values.price}
        onChange={(value) => {
          if (typeof value === "number") setFieldValue("price", value);
        }}
      />
      <NumberInput
        label="Edad mínima"
        labelPlacement="outside"
        name="minAge"
        id="minAge"
        isRequired
        type="number"
        hideStepper
        value={values.minAge}
        onChange={(value) => {
          if (typeof value === "number") setFieldValue("minAge", value);
        }}
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
        isRequired
        label="Temporada"
        labelPlacement="outside"
        placeholder="Seleccione una temporada"
        value={values.season}
        onChange={handleChange}
        items={seasonOptions}
      >
        {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
      </Select>

      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.PRICES}
        disableSubmitButton={
          isSubmitting || !dirty || Object.keys(errors).length > 0
        }
      />
    </form>
  );
}
