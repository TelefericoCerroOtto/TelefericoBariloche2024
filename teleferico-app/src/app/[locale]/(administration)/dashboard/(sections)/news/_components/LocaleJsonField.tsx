"use client";

import { i18n } from "@/i18n";
import type { Locales } from "@/types";
import { Textarea } from "@heroui/react";
import type { FormikErrors, FormikTouched, FormikValues } from "formik";

type LocaleConfig = {
  label: string;
  placeholder?: string;
  name: string;
};

interface Props<T extends FormikValues> {
  locale: Locales;
  config: Record<Locales, LocaleConfig>;
  values: T;
  errors: FormikErrors<T>;
  touched: FormikTouched<T>;
  handleChange: React.ChangeEventHandler<HTMLTextAreaElement | HTMLInputElement>;
  handleBlur: React.FocusEventHandler<HTMLTextAreaElement | HTMLInputElement>;
  isRequired?: boolean;
}

export default function LocaleJsonField<T extends FormikValues>(props: Props<T>) {
  const { locale, config, values, errors, touched, handleChange, handleBlur, isRequired = true } = props;

  const { label, placeholder, name } = config[locale] ?? config[i18n.defaultLocale];

  const value = values[name] as string;
  const error = errors[name] as string | undefined;
  const isTouched = touched[name];

  return (
    <Textarea
      name={name}
      id={name}
      label={`${label} (${locale})`}
      labelPlacement="outside"
      placeholder={placeholder}
      value={value ?? ""}
      minRows={8}
      classNames={{
        input: "font-mono",
      }}
      onChange={handleChange}
      onBlur={handleBlur}
      isRequired={isRequired}
      errorMessage={isTouched ? error : undefined}
      isInvalid={!!error && !!isTouched}
    />
  );
}
