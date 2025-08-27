import { i18n } from "@/i18n";
import type { Locales } from "@/types";
import { Input } from "@heroui/react";
import type { FormikErrors, FormikTouched } from "formik";

type LocaleConfig = {
  label: string;
  placeholder: string;
  name: string;
};

interface Props<T extends Record<string, unknown>> {
  locale: Locales;
  config: Record<Locales, LocaleConfig>;
  values: T;
  errors: FormikErrors<T>;
  touched: FormikTouched<T>;
  handleChange: React.ChangeEventHandler<HTMLInputElement>;
  handleBlur: React.FocusEventHandler<HTMLInputElement>;
}

export default function LocaleInputField<T extends Record<string, unknown>>({
  locale,
  config,
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
}: Props<T>) {
  const { label, placeholder, name } =
    config[locale] ?? config[i18n.defaultLocale];

  return (
    <Input
      label={label}
      labelPlacement="outside"
      placeholder={placeholder}
      name={name}
      id={name}
      value={values[name] as string}
      onChange={handleChange}
      onBlur={handleBlur}
      errorMessage={errors[name] as string}
      isInvalid={!!errors[name] && !!touched[name]}
    />
  );
}
