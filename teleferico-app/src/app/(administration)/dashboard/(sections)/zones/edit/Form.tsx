"use client";

import { FormButtons } from "@/components";
import { zoneScheduleSchema } from "@/lib/schemas/forms";
import type { ZoneScheduleFormData } from "@/types/forms";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import { Select, SelectItem } from "@nextui-org/react";
import { useFormik } from "formik";

const hours = Array.from({ length: 24 }, (_, index) => {
  const idxStr = index.toString();
  return {
    key: idxStr,
    label: index < 10 ? "0" + idxStr : idxStr,
  };
});

const mins = Array.from({ length: 60 }, (_, index) => {
  const idxStr = index.toString();
  return {
    key: idxStr,
    label: index < 10 ? "0" + idxStr : idxStr,
  };
});

export default function Form() {
  const onSubmit = async (values: ZoneScheduleFormData) => {
    console.log("form values", values);
  };

  const { values, handleSubmit, setValues, errors } =
    useFormik<ZoneScheduleFormData>({
      initialValues: {
        openHour: 0,
        openMins: 0,
        closeHour: 0,
        closeMins: 0,
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
      <div className="w-full">
        <p className="text-center font-bold sm:text-start">
          Horario De Apertura
        </p>
        <fieldset className="flex flex-col gap-5 sm:flex-row">
          <div className="flex items-center justify-center gap-3">
            <p>Hora:</p>
            <Select
              name="openHour"
              id="openHour"
              variant="bordered"
              className="w-[120px]"
              size="sm"
              scrollShadowProps={{
                isEnabled: false,
              }}
              items={hours}
              value={5}
              defaultSelectedKeys={[values.openHour.toString()]}
              onSelectionChange={(e) => {
                const openHour = parseInt(e.currentKey ?? "0");
                setValues({
                  ...values,
                  openHour,
                });
              }}
            >
              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
          </div>
          <div className="flex items-center justify-center gap-3">
            <p>Minutos:</p>
            <Select
              name="openMins"
              id="openMins"
              variant="bordered"
              className="w-[120px]"
              size="sm"
              scrollShadowProps={{
                isEnabled: false,
              }}
              items={mins}
              defaultSelectedKeys={[values.openMins.toString()]}
              onSelectionChange={(e) => {
                const openMins = parseInt(e.currentKey ?? "0");
                setValues({
                  ...values,
                  openMins,
                });
              }}
            >
              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
          </div>
        </fieldset>
      </div>
      <div className="w-full">
        <p className="text-center font-bold sm:text-start">Horario De Cierre</p>
        <fieldset className="flex flex-col gap-5 sm:flex-row">
          <div className="flex items-center justify-center gap-3">
            <p>Hora:</p>
            <Select
              name="closeHour"
              id="closeHour"
              variant="bordered"
              className="w-[120px]"
              size="sm"
              scrollShadowProps={{
                isEnabled: false,
              }}
              items={hours}
              defaultSelectedKeys={[values.closeHour.toString()]}
              onSelectionChange={(e) => {
                const closeHour = parseInt(e.currentKey ?? "0");
                setValues({
                  ...values,
                  closeHour,
                });
              }}
            >
              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
          </div>
          <div className="flex items-center justify-center gap-3">
            <p>Minutos:</p>
            <Select
              name="closeMins"
              id="closeMins"
              variant="bordered"
              className="w-[120px]"
              size="sm"
              scrollShadowProps={{
                isEnabled: false,
              }}
              items={mins}
              defaultSelectedKeys={[values.closeMins.toString()]}
              onSelectionChange={(e) => {
                const closeMins = parseInt(e.currentKey ?? "0");
                setValues({
                  ...values,
                  closeMins,
                });
              }}
            >
              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
          </div>
        </fieldset>
      </div>
      <FormButtons cancelRedirectRoute={ADMIN_ROUTES.ZONES} />
    </form>
  );
}
