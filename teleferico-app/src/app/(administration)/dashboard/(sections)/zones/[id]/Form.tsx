"use client";

import {
  FormButtons,
  LocaleInputField,
  LocaleSelection,
  TimeInput,
} from "@/components";
import { useLocaleSelection } from "@/hooks/use-locale-selection";
import { updateZoneSchema } from "@/lib/schemas/forms";
import type { ZoneFormData } from "@/types/forms";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import { Time } from "@internationalized/date";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateZoneAction } from "./actions";

interface Props {
  initialValues: ZoneFormData;
}

export default function Form(props: Props) {
  const { initialValues } = props;

  const [timeInputLoading, setTimeInputLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { locale, selectedKeys, handleSelectionChange } = useLocaleSelection();
  const router = useRouter();

  const onSubmit = async (values: ZoneFormData) => {
    setIsSubmitting(true);
    try {
      const res = await updateZoneAction(values);
      if (res.success) {
        alert("Zona actualizada exitosamente");
        return router.push(ADMIN_ROUTES.ZONES);
      }
      setIsSubmitting(false);
      console.log(res.message);
      return alert(
        `Ocurrió un error inesperado al actualizar la zona ${values["zoneName_es-AR"]}`,
      );
    } catch (error) {
      setIsSubmitting(false);
      console.log("new access ticket submit error: ", error);
      alert("Ocurrió un error al enviar el formulario");
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
      <LocaleSelection
        selectedKeys={selectedKeys}
        handleSelectionChange={handleSelectionChange}
      />
      <LocaleInputField
        config={{
          "es-AR": {
            label: "Nombre de la zona (Español)",
            name: "zoneName_es-AR",
            placeholder: "Ej.: Confiteria Giratoria",
          },
          en: {
            label: "Nombre de la zona (Inglés)",
            name: "zoneName_en",
            placeholder: "Ej.: Revolving restaurant",
          },
          pt: {
            label: "Nombre de la zona (Portugués)",
            name: "zoneName_pt",
            placeholder: "Ej.: Restarunte Giratório",
          },
        }}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />
      <TimeInput
        name="openTime"
        id="openTime"
        label="Horario De Apertura"
        labelPlacement="outside"
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
