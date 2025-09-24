"use client";

import type { Locales, NewsFormData } from "@/types";
import type { FormikErrors, FormikProps, FormikTouched, FormikValues } from "formik";
import MediaSelector from "./MediaSelector";

interface Props<T extends FormikValues> {
  locale: Locales;
  values: T;
  errors: FormikErrors<T>;
  touched: FormikTouched<T>;
  setFieldValue: FormikProps<T>["setFieldValue"];
  name: keyof NewsFormData;
  urlField: keyof NewsFormData;
  label: string;
  showErrors?: boolean;
}

export default function LocaleMediaSelector<T extends FormikValues>(props: Props<T>) {
  const {
    locale,
    values,
    errors,
    touched,
    setFieldValue,
    name,
    urlField,
    label,
    showErrors = false,
  } = props;

  const value = values[name as string] as string;
  const imageUrl = values[urlField as string] as string | undefined;
  const error = errors[name as string] as string | undefined;
  const isTouched = touched[name as string];

  return (
    <MediaSelector
      label={`${label} (${locale})`}
      value={value ?? ""}
      imageUrl={imageUrl ?? ""}
      error={isTouched || showErrors ? error : undefined}
      onChange={({ documentId, url }) => {
        setFieldValue(name as string, documentId);
        if (urlField) {
          setFieldValue(urlField as string, url ?? "");
        }
      }}
    />
  );
}
