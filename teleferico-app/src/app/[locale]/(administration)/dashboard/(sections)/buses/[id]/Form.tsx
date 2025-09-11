"use client";

import { FormButtons, TimeInput } from "@/components";
import { updateBusTripSchema } from "@/lib/schemas";
import type { Station, UpdateBusTripFormData } from "@/types";
import { ADMIN_ROUTES, selectInputStyles } from "@/utils";
import { Select, SelectItem } from "@heroui/react";
import { Time } from "@internationalized/date";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateBusTripAction } from "./actions";

interface Props {
  stations: Station[];
  initialValues: UpdateBusTripFormData;
}

export default function Form(props: Props) {
  const { stations, initialValues } = props;

  const [timeInputLoading, setTimeInputLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const onSubmit = async (values: UpdateBusTripFormData) => {
    setIsSubmitting(true);
    try {
      const res = await updateBusTripAction(values);
      if (res.success) {
        alert("Viaje actualizado exitosamente");
        return router.push(ADMIN_ROUTES.BUSES);
      }
      setIsSubmitting(false);
      console.log(res.message, "\n", res.data);
      return alert("Ocurrió un error inesperado al crear el viaje");
    } catch (error) {
      setIsSubmitting(false);
      console.log("new bus trip submit error: ", error);
      alert("Ocurrió un error al enviar el formulario");
    }
  };

  const { values, errors, dirty, handleChange, handleSubmit, setFieldValue } =
    useFormik<UpdateBusTripFormData>({
      initialValues,
      validationSchema: updateBusTripSchema,
      onSubmit,
    });

  return (
    <form
      className="flex flex-col gap-5 overflow-scroll"
      onSubmit={handleSubmit}
    >
      <Select
        {...selectInputStyles}
        name="origin"
        id="origin"
        label="Salida"
        placeholder="Seleccionar"
        value={values.origin}
        defaultSelectedKeys={new Set([values.origin])}
        onChange={handleChange}
        items={stations || []}
      >
        {(item) => (
          <SelectItem key={item.documentId}>
            {item.station_translations?.[0]?.name || item.key || "-"}
          </SelectItem>
        )}
      </Select>
      <Select
        {...selectInputStyles}
        name="destination"
        id="destination"
        label="Destino"
        value={values.destination}
        defaultSelectedKeys={new Set([values.destination])}
        onChange={handleChange}
        items={stations || []}
      >
        {(item) => (
          <SelectItem key={item.documentId}>
            {item.station_translations?.[0]?.name || item.key || "-"}
          </SelectItem>
        )}
      </Select>
      <TimeInput
        name="depTime"
        id="depTime"
        label="Horario De Salida"
        labelPlacement="outside"
        hourCycle={24}
        value={new Time(values.depTime.hour, values.depTime.mins)}
        onChange={(value) => {
          const newValue = { hour: value?.hour, mins: value?.minute };
          setFieldValue("depTime", newValue);
        }}
        // usamos onMount interno para detectar cuando se renderizó
        ref={(el) => {
          if (el) setTimeInputLoading(false);
        }}
      />
      <TimeInput
        name="arrTime"
        id="arrTime"
        label="Horario De Llegada"
        labelPlacement="outside"
        hourCycle={24}
        value={new Time(values.arrTime.hour, values.arrTime.mins)}
        onChange={(value) => {
          const newValue = { hour: value?.hour, mins: value?.minute };
          setFieldValue("arrTime", newValue);
        }}
        // usamos onMount interno para detectar cuando se renderizó
        ref={(el) => {
          if (el) setTimeInputLoading(false);
        }}
      />
      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.PRICES}
        disableSubmitButton={
          !dirty ||
          timeInputLoading ||
          Object.keys(errors).length > 0 ||
          !values.origin ||
          !values.destination
        }
      />
    </form>
  );
}
