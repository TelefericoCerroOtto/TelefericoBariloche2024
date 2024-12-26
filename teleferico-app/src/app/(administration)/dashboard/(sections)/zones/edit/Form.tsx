"use client";

import { FormButtons, TimeInput } from "@/components";
import { zoneScheduleSchema } from "@/lib/schemas/forms";
import type { ZoneScheduleFormData } from "@/types/forms";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import { useFormik } from "formik";

export default function Form() {
  const onSubmit = async (values: ZoneScheduleFormData) => {
    console.log("form values", values);
  };

  const { values, handleSubmit, setValues, errors } =
    useFormik<ZoneScheduleFormData>({
      initialValues: {
        openTime: { hour: 0, mins: 0 },
        closeTime: { hour: 0, mins: 0 },
      },
      validationSchema: zoneScheduleSchema,
      onSubmit,
    });

  console.log("errors", errors);
  // console.log("values", values);

  return (
    <form
      className="flex flex-col items-center gap-6 overflow-scroll"
      onSubmit={handleSubmit}
    >
      <TimeInput
        title="Horario De Apertura"
        defaultHour={values.openTime}
        onHourChange={(e) => {
          const hour = parseInt(e.currentKey ?? "0");
          setValues({
            ...values,
            openTime: {
              hour,
              mins: values.openTime.mins,
            },
          });
        }}
        defaultMin={values.openTime}
        onMinChange={(e) => {
          const mins = parseInt(e.currentKey ?? "0");
          setValues({
            ...values,
            openTime: {
              mins,
              hour: values.openTime.hour,
            },
          });
        }}
      />
      <TimeInput
        title="Horario De Cierre"
        defaultHour={values.closeTime}
        onHourChange={(e) => {
          const hour = parseInt(e.currentKey ?? "0");
          setValues({
            ...values,
            closeTime: {
              hour,
              mins: values.closeTime.mins,
            },
          });
        }}
        defaultMin={values.closeTime}
        onMinChange={(e) => {
          const mins = parseInt(e.currentKey ?? "0");
          setValues({
            ...values,
            closeTime: {
              mins,
              hour: values.closeTime.hour,
            },
          });
        }}
      />
      <FormButtons cancelRedirectRoute={ADMIN_ROUTES.ZONES} />
    </form>
  );
}
