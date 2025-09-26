"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
  Rte,
} from "@/components";
import { useFormLocaleSelector } from "@/hooks";
import { i18n } from "@/i18n";
import { newsFormSchema } from "@/lib/schemas";
import type { NewsFormData } from "@/types";
import { ADMIN_ROUTES } from "@/utils";
import { addToast, Checkbox, Input } from "@heroui/react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  bodyConfig,
  briefConfig,
  coverAltConfig,
  titleConfig,
} from "../_components/data";
import MediaSelector from "../_components/MediaSelector";
import { createNewsAction } from "./actions";

const buildInitialValues = (): NewsFormData => {
  const base: Record<string, unknown> = {
    highglighted: false,
    date: "",
  };

  i18n.locales.forEach((locale) => {
    base[`title_${locale}`] = "";
    base[`body_${locale}`] = "[]";
    base[`brief_${locale}`] = "[]";
    base[`coverAlt_${locale}`] = "";
  });

  base.coverImage = "";
  base.coverImageUrl = "";

  return base as NewsFormData;
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
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    dirty,
  } = useFormik<NewsFormData>({
    initialValues: buildInitialValues(),
    validationSchema: newsFormSchema,
    enableReinitialize: true,
    onSubmit: async (formValues) => {
      setIsSubmitting(true);
      try {
        const res = await createNewsAction(formValues);
        if (res.success) {
          addToast({
            title: res.message,
            color: "success",
            timeout: 2500,
          });
          router.push(ADMIN_ROUTES.NEWS);
        } else {
          addToast({
            title: res.message,
            color: "danger",
            timeout: 3000,
          });
          console.error("create/update news error", res.data);
          setIsSubmitting(false);
        }
      } catch (error) {
        console.error("news form submit error", error);
        addToast({
          title: "Ocurrió un error al guardar la noticia.",
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
        config={titleConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <InputLocaleWrapper
        Input={Rte}
        config={bodyConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <InputLocaleWrapper
        Input={Rte}
        config={briefConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <InputLocaleWrapper
        Input={Input}
        config={coverAltConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <MediaSelector
        label="Imagen de portada"
        value={values.coverImage ?? ""}
        imageUrl={values.coverImageUrl ?? ""}
        error={
          touched.coverImage || isSubmitting
            ? (errors.coverImage as string)
            : undefined
        }
        onChange={({ documentId, url }) => {
          setFieldValue("coverImage", documentId);
          setFieldValue("coverImageUrl", url ?? "");
        }}
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
        isSelected={values.highglighted}
        onValueChange={(checked) => setFieldValue("highglighted", checked)}
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
