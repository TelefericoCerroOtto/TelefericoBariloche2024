"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
  MediaSelector,
  Rte,
} from "@/components";
import { useFormLocaleSelector } from "@/hooks";
import { createNewSchema } from "@/lib/schemas";
import type { CreateNewFormData } from "@/types";
import { ADMIN_ROUTES } from "@/utils";
import { addToast, Checkbox, Input } from "@heroui/react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bodyConfig, briefConfig, titleConfig } from "../_components/data";
import { createNewsAction } from "./actions";
import { createEmptyJSONContent } from "@/utils/tiptap";

const buildInitialValues = (): CreateNewFormData => {
  const base: CreateNewFormData = {
    highlighted: false,
    date: "",
    "title_es-AR": "",
    title_en: "",
    title_pt: "",
    "body_es-AR": createEmptyJSONContent(),
    body_en: createEmptyJSONContent(),
    body_pt: createEmptyJSONContent(),
    "brief_es-AR": createEmptyJSONContent(),
    brief_en: createEmptyJSONContent(),
    brief_pt: createEmptyJSONContent(),
    newCoverImageFile: null,
  };

  return base;
};

export default function NewsForm() {
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
  } = useFormik<CreateNewFormData>({
    initialValues: buildInitialValues(),
    validationSchema: createNewSchema,
    enableReinitialize: true,
    onSubmit: async (formValues) => {
      setIsSubmitting(true);
      try {
        const res = await createNewsAction(formValues);
        if (res.success) {
          addToast({
            title: "Noticia creada exitosamente.",
            color: "success",
            timeout: 2500,
          });
          router.push(ADMIN_ROUTES.NEWS);
        } else {
          addToast({
            title: "Ocurrió un error al crear la noticia.",
            color: "danger",
            timeout: 3000,
          });
          console.error(
            "create/update news error: ",
            res.message,
            " -> ",
            res.data,
          );
          setIsSubmitting(false);
        }
      } catch (error) {
        console.error("news form submit error", error);
        addToast({
          title: "Ocurrió un error inesperado al crear la noticia.",
          color: "danger",
          timeout: 3000,
        });
        setIsSubmitting(false);
      }
    },
  });

  const disableSubmitButton =
    isSubmitting || Object.keys(errors).length > 0 || !dirty;

  console.log("errors: ", errors.newCoverImageFile);

  return (
    <form className="flex flex-col gap-5 overflow-auto" onSubmit={handleSubmit}>
      <FormLocaleSelector
        selectedKeys={selectedKeys}
        handleSelectionChange={handleSelectionChange}
      />
      <InputLocaleWrapper
        Input={Input}
        config={titleConfig}
        formik={{ values, setFieldValue, setFieldTouched, errors, touched }}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <InputLocaleWrapper
        Input={Rte}
        config={bodyConfig}
        formik={{ values, setFieldValue, setFieldTouched, errors, touched }}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <InputLocaleWrapper
        Input={Rte}
        config={briefConfig}
        formik={{ values, setFieldValue, setFieldTouched, errors, touched }}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <MediaSelector
        name="newCoverImageFile"
        label="Imagen de portada"
        value={values.newCoverImageFile}
        onChange={async (file) => {
          await setFieldValue("newCoverImageFile", file, true);
          await setFieldTouched("newCoverImageFile", true, true);
        }}
        isRequired
        disabled={isSubmitting}
        isInvalid={!!errors.newCoverImageFile && !!touched.newCoverImageFile}
        errorMessage={errors.newCoverImageFile as string}
        maxSizeMB={5}
      />
      <Input
        type="date"
        label="Fecha de publicación"
        labelPlacement="outside"
        value={values.date}
        name="date"
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={touched.date ? (errors.date as string) : undefined}
        isInvalid={!!errors.date && !!touched.date}
        className="max-w-xs"
      />
      <Checkbox
        id="highlighted"
        name="highlighted"
        isSelected={values.highlighted}
        onChange={handleChange}
      >
        Noticia destacada
      </Checkbox>
      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.NEWS}
        disableSubmitButton={disableSubmitButton}
      />
    </form>
  );
}
