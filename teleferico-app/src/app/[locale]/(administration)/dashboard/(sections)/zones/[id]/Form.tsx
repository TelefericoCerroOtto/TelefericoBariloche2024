"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
  TimeInput,
} from "@/components";
import { useAppAlert, useFormLocaleSelector } from "@/hooks";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import { formTimeInputClassNames } from "@/lib/constants/styles.const";
import { updateZoneSchema } from "@/lib/schemas";
import type { ZoneFormData } from "@/types/forms";
import { Input, Switch } from "@heroui/react";
import { Time } from "@internationalized/date";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateZoneAction } from "./actions";
import { nameConfig } from "./data";

interface Props {
  initialValues: ZoneFormData;
}

export default function Form(props: Props) {
  const { initialValues } = props;

  const [timeInputLoading, setTimeInputLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();
  const router = useRouter();
  const { showAlert } = useAppAlert();

  const onSubmit = async (values: ZoneFormData) => {
    setIsSubmitting(true);
    try {
      const res = await updateZoneAction(values);
      if (res.success) {
        showAlert({
          title: "Éxito",
          message: "Zona actualizada exitosamente",
          variant: "success",
        });
        return router.push(ADMIN_ROUTES.ZONES);
      }
      setIsSubmitting(false);
      console.log(res.message);
      showAlert({
        title: "Error",
        message: `Ocurrió un error inesperado al actualizar la zona ${values["zoneName_es-AR"]}`,
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
    dirty,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldTouched,
  } = useFormik<ZoneFormData>({
    initialValues,
    validationSchema: updateZoneSchema,
    onSubmit,
  });

  return (
    <form
      className="flex flex-col gap-6 overflow-scroll"
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
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />
      <TimeInput
        name="openTime"
        id="openTime"
        label="Horario De Apertura"
        labelPlacement="outside"
        classNames={formTimeInputClassNames}
        hourCycle={24}
        value={new Time(values.openTime.hour, values.openTime.mins)}
        onChange={(value) => {
          const newValue = { hour: value?.hour, mins: value?.minute };
          setFieldValue("openTime", newValue);
        }}
        // usamos onMount interno para detectar cuando se renderizó
        ref={(el) => {
          if (el) setTimeInputLoading(false);
        }}
      />
      <TimeInput
        name="closeTime"
        id="closeTime"
        label="Horario De Cierre"
        labelPlacement="outside"
        classNames={formTimeInputClassNames}
        hourCycle={24}
        value={new Time(values.closeTime.hour, values.closeTime.mins)}
        onChange={(value) => {
          const newValue = { hour: value?.hour, mins: value?.minute };
          setFieldValue("closeTime", newValue);
        }}
        // usamos onMount interno para detectar cuando se renderizó
        ref={(el) => {
          if (el) setTimeInputLoading(false);
        }}
      />
      <Switch
        name="isOpen"
        id="isOpen"
        isSelected={values.isOpen}
        onChange={handleChange}
      >
        {values.isOpen ? "Abierto al público" : "Cerrado al público"}
      </Switch>

      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.ZONES}
        disableSubmitButton={
          !dirty || Object.keys(errors).length > 0 || timeInputLoading
        }
      />
    </form>
  );
}
