"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
} from "@/components";
import { useFormLocaleSelector } from "@/hooks";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import { formCheckboxClassNames } from "@/lib/constants/styles.const";
import { updateFaqSchema } from "@/lib/schemas";
import type { UpdateFaqFormData } from "@/types";
import { addToast, Checkbox, Input, Textarea } from "@heroui/react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { answerConfig, questionConfig } from "../_components/data";
import { updateFaqAction } from "./actions";

interface Props {
  initialValues: UpdateFaqFormData;
}

export default function FaqForm(props: Props) {
  const { initialValues } = props;
  const router = useRouter();
  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    values,
    errors,
    touched,
    dirty,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldTouched,
  } = useFormik<UpdateFaqFormData>({
    initialValues,
    validationSchema: updateFaqSchema,
    onSubmit: async (formValues) => {
      setIsSubmitting(true);
      try {
        const res = await updateFaqAction(formValues);
        if (res.success) {
          addToast({
            title: "Pregunta frecuente actualizada exitosamente.",
            color: "success",
            timeout: 2500,
          });
          router.push(ADMIN_ROUTES.FAQS);
        } else {
          addToast({
            title: "Ocurrió un error al actualizar la pregunta frecuente.",
            color: "danger",
            timeout: 3000,
          });
          console.error("update faq error: ", res.message, " -> ", res.data);
          setIsSubmitting(false);
        }
      } catch (error) {
        console.error("faq form submit error", error);
        addToast({
          title:
            "Ocurrió un error inesperado al actualizar la pregunta frecuente.",
          color: "danger",
          timeout: 3000,
        });
        setIsSubmitting(false);
      }
    },
  });

  const disableSubmitButton =
    isSubmitting || Object.keys(errors).length > 0 || !dirty;

  return (
    <form className="flex flex-col gap-5 overflow-auto" onSubmit={handleSubmit}>
      <FormLocaleSelector
        selectedKeys={selectedKeys}
        handleSelectionChange={handleSelectionChange}
      />
      <InputLocaleWrapper
        Input={Input}
        config={questionConfig}
        formik={{ values, setFieldValue, setFieldTouched, errors, touched }}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <InputLocaleWrapper
        Input={Textarea}
        config={answerConfig}
        formik={{ values, setFieldValue, setFieldTouched, errors, touched }}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <Checkbox
        id="featured"
        name="featured"
        isSelected={values.featured}
        onChange={handleChange}
        classNames={formCheckboxClassNames}
      >
        Pregunta destacada
      </Checkbox>
      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.FAQS}
        disableSubmitButton={disableSubmitButton}
      />
    </form>
  );
}
