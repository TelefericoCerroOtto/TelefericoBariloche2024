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
import { updateActivitySchema } from "@/lib/schemas";
import type { UpdateActivityFormData } from "@/types";
import {
  Input,
  NumberInput,
  Select,
  SelectItem,
  Switch,
  Textarea,
  Tooltip,
} from "@heroui/react";
import { useFormik } from "formik";
import { Info, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LABEL_TOOLTIP_TEXT_EDIT,
  MAX_AGE_TOOLTIP_TEXT,
  seasonOptions,
} from "../data";
import { updateActivityAction } from "./actions";
import { descConfig, nameConfig, requirementsConfig } from "./data";

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
        return router.push(`${ADMIN_ROUTES.PRICES}?selected=activities`);
      }
      setIsSubmitting(false);
      console.log(res.message, "\n", res.data);
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

  return (
    <form
      className="flex flex-col gap-5 overflow-scroll"
      onSubmit={handleSubmit}
    >
      <FormLocaleSelector
        selectedKeys={selectedKeys}
        handleSelectionChange={handleSelectionChange}
      />
      <Tooltip content={LABEL_TOOLTIP_TEXT_EDIT} placement="top">
        <div className="inline-block w-full cursor-not-allowed">
          <Input
            id="label"
            name="label"
            labelPlacement="outside"
            label="Etiqueta"
            isDisabled
            classNames={formInputClassNames}
            value={values.label}
            endContent={<Tag size={18} className="text-default-400" />}
          />
        </div>
      </Tooltip>
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
        isRequired
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
        onBlur={handleBlur}
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
        onBlur={handleBlur}
        errorMessage={errors.minAge}
        isInvalid={!!errors.minAge && !!touched.minAge}
      />

      <NumberInput
        labelPlacement="outside"
        name="maxAge"
        id="maxAge"
        type="number"
        classNames={formInputClassNames}
        hideStepper
        value={values.maxAge}
        placeholder="Ej.: 13"
        onChange={(value) => {
          if (typeof value === "number") setFieldValue("maxAge", value);
        }}
        onBlur={handleBlur}
        label={
          <div className="flex items-center gap-2">
            <span>Edad máxima</span>

            {/* Tooltip junto al label */}
            <Tooltip content={MAX_AGE_TOOLTIP_TEXT} placement="right">
              <span
                className="inline-flex cursor-pointer font-bold text-blue-600"
                aria-label="Información sobre el campo etiqueta"
              >
                <Info size={18} />
              </span>
            </Tooltip>
          </div>
        }
        errorMessage={errors.maxAge}
        isInvalid={!!errors.maxAge && !!touched.maxAge}
      />

      <Select
        name="season"
        id="season"
        placeholder="Seleccione una temporada"
        label="Temporada"
        labelPlacement="outside"
        radius="full"
        variant="flat"
        className="rounded-full"
        classNames={selectInputStyles.classNames}
        defaultSelectedKeys={[values.season]}
        onChange={handleChange}
        onBlur={handleBlur}
        isRequired
        disallowEmptySelection
        items={seasonOptions}
      >
        {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
      </Select>

      <Switch
        name="available"
        id="available"
        isSelected={values.available}
        onChange={handleChange}
      >
        {values.available ? "Actividad disponible" : "Cerrada al público"}
      </Switch>

      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={`${ADMIN_ROUTES.PRICES}?selected=activities`}
        disableSubmitButton={
          isSubmitting || !dirty || Object.keys(errors).length > 0
        }
      />
    </form>
  );
}
