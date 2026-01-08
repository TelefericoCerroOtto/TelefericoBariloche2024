"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
} from "@/components";
import { useAppAlert, useFormLocaleSelector } from "@/hooks";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import {
  formInputClassNames,
  selectInputStyles,
} from "@/lib/constants/styles.const";
import { updateAccessTicketSchema } from "@/lib/schemas";
import type { UpdateAccessTicketFormData } from "@/types/forms";
import { Input, NumberInput, Select, SelectItem } from "@heroui/react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateTicketAction } from "./actions";
import { nameConfig } from "./data";

interface Props {
  initialValues: UpdateAccessTicketFormData;
}

export default function Form(props: Props) {
  const { initialValues } = props;
  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { showAlert } = useAppAlert();

  const onSubmit = async (values: UpdateAccessTicketFormData) => {
    setIsSubmitting(true);
    try {
      const res = await updateTicketAction(values);
      if (res.success) {
        showAlert({
          title: "Éxito",
          message: "Tarifa actualizada exitosamente",
          variant: "success",
        });
        return router.push(`${ADMIN_ROUTES.PRICES}?selected=tickets`);
      }
      setIsSubmitting(false);
      console.log(res.message);
      return showAlert({
        title: "Éxito",
        message: "Ocurrió un error inesperado al actualizar la tarifa",
        variant: "success",
      });
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
    dirty,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldTouched,
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
        classNames={selectInputStyles.classNames}
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
        classNames={formInputClassNames}
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
        cancelRedirectRoute={`${ADMIN_ROUTES.PRICES}?selected=tickets`}
        disableSubmitButton={
          !dirty ||
          Object.keys(errors).length > 0 ||
          values.accessName_en === ""
        }
      />
    </form>
  );
}
