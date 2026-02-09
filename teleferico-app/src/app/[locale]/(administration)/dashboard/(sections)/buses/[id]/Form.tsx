"use client";

import { FormButtons, TimeInput } from "@/components";
import { useAppAlert } from "@/hooks";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import {
  formTimeInputClassNames,
  selectInputStyles,
} from "@/lib/constants/styles.const";
import { updateBusTripSchema } from "@/lib/schemas";
import type { Station, UpdateBusTripFormData } from "@/types";
import { Select, SelectItem, Switch } from "@heroui/react";
import { Time } from "@internationalized/date";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateBusTripAction } from "./actions";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  stations: Station[];
  initialValues: UpdateBusTripFormData;
}

export default function Form(props: Props) {
  const { stations, initialValues } = props;

  const [timeInputLoading, setTimeInputLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { showAlert } = useAppAlert();

  const onSubmit = async (values: UpdateBusTripFormData) => {
    setIsSubmitting(true);
    try {
      const res = await updateBusTripAction(values);
      if (res.success) {
        showAlert({
          title: "Éxito",
          message: "Viaje actualizado correctamente",
          variant: "success",
        });
        return router.push(ADMIN_ROUTES.BUSES);
      }
      setIsSubmitting(false);
      console.log(res.message, "\n", res.data);
      showAlert({
        title: "Error",
        message: "Ocurrió un error al actualizar el viaje",
        variant: "danger",
      });
      return;
    } catch (error) {
      setIsSubmitting(false);
      console.log("new bus trip submit error: ", error);
      showAlert({
        title: "Error",
        message: "Ocurrió un error al actualizar el viaje",
        variant: "danger",
      });
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
      className="flex flex-col gap-5 overflow-visible"
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
        classNames={formTimeInputClassNames}
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
        classNames={formTimeInputClassNames}
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

      <Switch
        name="isVisible"
        id="isVisible"
        isSelected={values.isVisible}
        onChange={handleChange}
        startContent={<Eye />}
        endContent={<EyeOff />}
      >
        {values.isVisible ? "Visible al público" : "Oculto al público"}
      </Switch>

      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.BUSES}
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
