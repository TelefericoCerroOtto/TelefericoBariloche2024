"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
} from "@/components";
import { useAppAlert, useFormLocaleSelector } from "@/hooks";
import { createAccessTicketSchema } from "@/lib/schemas";
import type { CreateAccessTicketFormData } from "@/types";
import { ADMIN_ROUTES } from "@/utils";
import {
  addToast,
  Input,
  NumberInput,
  Select,
  SelectItem,
} from "@heroui/react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { newTicketAction } from "./actions";
import { nameConfig } from "./data";

export default function Form() {
  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { showAlert } = useAppAlert();

  const onSubmit = async (values: CreateAccessTicketFormData) => {
    try {
      setIsSubmitting(true);
      const res = await newTicketAction(values);
      if (res.success) {
        showAlert({
          title: "Éxito",
          message: "Nueva tarifa creada exitosamente",
          variant: "success",
        });
        return router.push(ADMIN_ROUTES.PRICES);
      }
      setIsSubmitting(false);
      console.log(res.message);
      showAlert({
        title: "Error",
        message: "Ocurrió un error al crear la tarifa",
        variant: "danger",
      });
      return;
    } catch (error) {
      setIsSubmitting(false);
      console.log("new access ticket submit error: ", error);
      showAlert({
        title: "Error",
        message: "Ocurrió un error al enviar el formulario",
        variant: "danger",
      });
    }
  };

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
  } = useFormik<CreateAccessTicketFormData>({
    initialValues: {
      accessName_en: "",
      "accessName_es-AR": "",
      accessName_pt: "",
      price: 0,
      liftingMean: "cablecar",
    },
    validationSchema: createAccessTicketSchema,
    onSubmit,
  });

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
        config={nameConfig}
        isRequired
        formik={{ values, errors, touched, setFieldTouched, setFieldValue }}
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
        disableAction={() => {
          addToast({
            title:
              "Faltan campos por completar y/o no son válidos. Por favor revíselos.",
            color: "danger",
            timeout: 2000,
          });
        }}
      />
    </form>
  );
}
