"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
} from "@/components";
import { useAppAlert, useFormLocaleSelector } from "@/hooks";
import { createActivitySchema } from "@/lib/schemas";
import type { CreateActivityFormData } from "@/types";
import { ADMIN_ROUTES } from "@/utils";
import {
  Input,
  NumberInput,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { seasonOptions } from "../data";
import { createActivityAction } from "./actions";
import { descConfig, nameConfig, requirementsConfig } from "./data";

export default function Form() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();
  const { showAlert } = useAppAlert();

  const onSubmit = async (values: CreateActivityFormData) => {
    try {
      setIsSubmitting(true);
      const res = await createActivityAction(values);
      if (res.success) {
        showAlert({
          title: "Éxito",
          message: "Nueva actividad creada exitosamente",
          variant: "success",
        });
        return router.push(ADMIN_ROUTES.PRICES);
      }
      setIsSubmitting(false);
      console.log(res.message);
      showAlert({
        title: "Error",
        message: "Ocurrió un error al crear la actividad",
        variant: "danger",
      });
      return;
    } catch (error) {
      setIsSubmitting(false);
      console.log("new activity ticket submit error: ", error);
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
    handleSubmit,
    setFieldValue,
    setFieldTouched,
  } = useFormik<CreateActivityFormData>({
    initialValues: {
      "activityName_es-AR": "",
      activityName_en: "",
      activityName_pt: "",
      "description_es-AR": "",
      description_en: "",
      description_pt: "",
      "requirements_es-AR": "",
      requirements_en: "",
      requirements_pt: "",
      price: 0,
      minAge: 0,
      season: "allSeasons",
    },
    validationSchema: createActivitySchema,
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
        formik={{ values, errors, touched, setFieldTouched, setFieldValue }}
        isRequired
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />
      <InputLocaleWrapper
        Input={Textarea}
        config={descConfig}
        formik={{ values, errors, touched, setFieldTouched, setFieldValue }}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />
      <InputLocaleWrapper
        Input={Input}
        config={requirementsConfig}
        formik={{ values, errors, touched, setFieldTouched, setFieldValue }}
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
          isSubmitting ||
          Object.keys(errors).length > 0 ||
          values.activityName_en === ""
        }
      />
    </form>
  );
}
