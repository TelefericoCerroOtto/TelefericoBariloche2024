"use client";

import { FormButtons, TimeInput } from "@/components";
import { createBusTripSchema } from "@/lib/schemas";
import type { CreateBusTripFormData, Station } from "@/types";
import { ADMIN_ROUTES, selectInputStyles } from "@/utils";
import { Select, SelectItem } from "@heroui/react";
import { Time } from "@internationalized/date";
import { useFormik } from "formik";
import { useState } from "react";
import { createBusTripAction } from "./actions";
import { useRouter } from "next/navigation";

interface Props {
  stations: Station[];
}

export default function Form(props: Props) {
  const { stations } = props;

  const [timeInputLoading, setTimeInputLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const onSubmit = async (values: CreateBusTripFormData) => {
    setIsSubmitting(true);
    try {
      const res = await createBusTripAction(values);
      if (res.success) {
        alert("Viaje creado exitosamente");
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

  const { values, handleChange, handleSubmit, setFieldValue, errors } =
    useFormik<CreateBusTripFormData>({
      initialValues: {
        origin: "",
        arrTime: { hour: 0, mins: 0 },
        destination: "",
        depTime: { hour: 0, mins: 0 },
      },
      validationSchema: createBusTripSchema,
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
          timeInputLoading ||
          Object.keys(errors).length > 0 ||
          !values.origin ||
          !values.destination
        }
      />
    </form>
  );
}
