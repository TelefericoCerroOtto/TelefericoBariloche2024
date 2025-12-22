"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
} from "@/components";
import { useAppAlert, useFormLocaleSelector } from "@/hooks";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import { updateActivitySchema } from "@/lib/schemas";
import type { UpdateActivityFormData } from "@/types";
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
import { updateActivityAction } from "./actions";
import { descConfig, nameConfig, requirementsConfig } from "./data";
import {
  formInputClassNames,
  selectInputStyles,
} from "@/lib/constants/styles.const";

interface Props {
  initialValues: UpdateActivityFormData;
}

export default function Form(props: Props) {
  const { initialValues } = props;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();
  const { showAlert } = useAppAlert();

  const onSubmit = async (values: UpdateActivityFormData) => {
    setIsSubmitting(true);
    try {
      const res = await updateActivityAction(values);
      if (res.success) {
        showAlert({
          title: "Éxito",
          message: "Actividad actualizada exitosamente",
          variant: "success",
        });
        return router.push(ADMIN_ROUTES.PRICES);
      }
      setIsSubmitting(false);
      console.log(res.message);
      showAlert({
        title: "Error",
        message: "Ocurrió un error al actualizar la actividad",
        variant: "danger",
      });
      return;
    } catch (error) {
      setIsSubmitting(false);
      console.log("update activity submit error: ", error);
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
    dirty,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldTouched,
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
        classNames={formInputClassNames}
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
        classNames={formInputClassNames}
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
        classNames={selectInputStyles.classNames}
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
