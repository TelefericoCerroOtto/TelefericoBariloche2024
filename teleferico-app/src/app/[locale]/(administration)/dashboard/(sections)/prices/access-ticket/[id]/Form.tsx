"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
} from "@/components";
import { useFormLocaleSelector } from "@/hooks";
import { updateAccessTicketSchema } from "@/lib/schemas";
import type { UpdateAccessTicketFormData } from "@/types/forms";
import { ADMIN_ROUTES } from "@/utils";
import { Input, NumberInput, Select, SelectItem } from "@heroui/react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateTicketAction } from "./actions";

interface Props {
  initialValues: UpdateAccessTicketFormData;
}

export default function Form(props: Props) {
  const { initialValues } = props;
  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const onSubmit = async (values: UpdateAccessTicketFormData) => {
    setIsSubmitting(true);
    try {
      const res = await updateTicketAction(values);
      if (res.success) {
        alert("Tarifa actualizada exitosamente");
        return router.push(ADMIN_ROUTES.PRICES);
      }
      setIsSubmitting(false);
      console.log(res.message);
      return alert("Ocurrió un error inesperado al actualizar la tarifa");
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
    dirty,
    handleChange,
    handleBlur,
    setFieldValue,
    handleSubmit,
  } = useFormik<UpdateAccessTicketFormData>({
    initialValues,
    validationSchema: updateAccessTicketSchema,
    onSubmit,
  });

  console.log("values: ", values);

  return (
    <form
      className="flex flex-col gap-5 overflow-scroll"
      onSubmit={handleSubmit}
    >
      <FormLocaleSelector
        selectedKeys={selectedKeys}
        handleSelectionChange={handleSelectionChange}
      />

      <InputLocaleWrapper
        Input={Input}
        config={{
          "es-AR": {
            label: "Nombre de la tarifa (Español)",
            name: "accessName_es-AR",
            placeholder: "Ej.: Ticket mayor",
          },
          en: {
            label: "Nombre de la tarifa (Inglés)",
            name: "accessName_en",
            placeholder: "Ej.: Adult ticket",
          },
          pt: {
            label: "Nombre de la tarifa (Portugués)",
            name: "accessName_pt",
            placeholder: "Ej.: Bilhete sênior",
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

      <Select
        name="liftingMean"
        id="liftingMean"
        variant="flat"
        radius="full"
        className="rounded-full"
        classNames={{
          trigger: "bg-accent hover:bg-accent border border-custom-border",
        }}
        label="Medio De Elevación"
        labelPlacement="outside"
        placeholder="Seleccionar"
        isRequired
        defaultSelectedKeys={new Set([values.liftingMean])}
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
        isRequired
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
          !dirty ||
          Object.keys(errors).length > 0 ||
          values.accessName_en === ""
        }
      />
    </form>
  );
}
