"use client";

import { FormButtons, TimeInput } from "@/components";
import { BusTravelSchema } from "@/lib/schemas/forms";
import type { BusTravelFormData } from "@/types/forms";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import { selectInputStyles } from "@/utils/styles";
import { Select, SelectItem } from "@heroui/react";
import { useFormik } from "formik";

export default function Form() {
  const onSubmit = async (values: BusTravelFormData) => {
    console.log("form values", values);
  };

  const {
    values,
    handleChange,
    handleSubmit,
    setValues,
    errors,
    isSubmitting,
  } = useFormik<BusTravelFormData>({
    initialValues: {
      arrPoint: "",
      arrTime: { hour: 0, mins: 0 },
      depPoint: "",
      depTime: { hour: 0, mins: 0 },
    },
    validationSchema: BusTravelSchema,
    onSubmit,
  });

  console.log("errors", errors);

  return (
    <form
      className="flex flex-col gap-5 overflow-scroll"
      onSubmit={handleSubmit}
    >
      <Select
        {...selectInputStyles}
        name="depPoint"
        id="depPoint"
        label="Medio De Elevación"
        placeholder="Seleccionar"
        value={values.depPoint}
        onChange={handleChange}
      >
        <SelectItem key="teleferico">Teleferico</SelectItem>
        <SelectItem key="camino">Camino y funicular</SelectItem>
      </Select>
      <Select
        {...selectInputStyles}
        name="arrPoint"
        id="arrPoint"
        label="Medio De Elevación"
        value={values.arrPoint}
        onChange={handleChange}
      >
        <SelectItem key="teleferico">Teleferico</SelectItem>
        <SelectItem key="camino">Camino y funicular</SelectItem>
      </Select>
      <TimeInput
        title="Horario De Salida"
        defaultHour={values.depTime}
        onHourChange={(e) => {
          const hour = parseInt(e.currentKey ?? "0");
          setValues({
            ...values,
            depTime: {
              hour,
              mins: values.depTime.mins,
            },
          });
        }}
        defaultMin={values.depTime}
        onMinChange={(e) => {
          const mins = parseInt(e.currentKey ?? "0");
          setValues({
            ...values,
            depTime: {
              mins,
              hour: values.depTime.hour,
            },
          });
        }}
      />
      <TimeInput
        title="Horario De Llegada"
        defaultHour={values.arrTime}
        onHourChange={(e) => {
          const hour = parseInt(e.currentKey ?? "0");
          setValues({
            ...values,
            arrTime: {
              mins: values.arrTime.mins,
              hour,
            },
          });
        }}
        defaultMin={values.arrTime}
        onMinChange={(e) => {
          const mins = parseInt(e.currentKey ?? "0");
          setValues({
            ...values,
            arrTime: {
              mins,
              hour: values.depTime.hour,
            },
          });
        }}
      />
      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.PRICES}
      />
    </form>
  );
}
