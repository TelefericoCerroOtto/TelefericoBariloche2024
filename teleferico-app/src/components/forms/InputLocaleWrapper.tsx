/* eslint-disable no-unused-vars */
import { Rte } from "@/components";
import { i18n } from "@/i18n";
import type { Locales } from "@/types";
import {
  InputProps,
  type InternalForwardRefRenderFunction,
  type TextAreaProps,
} from "@heroui/react";
import { type JSONContent } from "@tiptap/react";
import type { FormikErrors, FormikTouched } from "formik";
import { ComponentProps, ComponentType } from "react";

type LocaleConfig = {
  label: string;
  placeholder: string;
  name: string;
};

interface Props<T extends Record<string, unknown>> {
  Input:
    | InternalForwardRefRenderFunction<"textarea", TextAreaProps, never>
    | InternalForwardRefRenderFunction<"input", InputProps, never>
    | ComponentType<Omit<ComponentProps<typeof Rte>, "onChange" | "onBlur">>;
  formik: {
    values: T;
    errors: FormikErrors<T>;
    touched: FormikTouched<T>;
    setFieldValue: (
      field: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: any,
      shouldValidate?: boolean,
    ) => Promise<void> | Promise<FormikErrors<T>>;
    setFieldTouched: (
      field: string,
      touched?: boolean | undefined,
      shouldValidate?: boolean | undefined,
    ) => Promise<void> | Promise<FormikErrors<T>>;
  };

  locale: Locales;
  config: Record<Locales, LocaleConfig>;
  isRequired?: boolean;
  handleChange: React.ChangeEventHandler<HTMLInputElement>;
  handleBlur: React.FocusEventHandler<HTMLInputElement>;
}

export default function InputLocaleWrapper<T extends Record<string, unknown>>({
  Input,
  locale,
  config,
  formik,
  isRequired = false,
  handleChange,
  handleBlur,
}: Props<T>) {
  const { values, errors, touched, setFieldTouched, setFieldValue } = formik;
  const { label, placeholder, name } =
    config[locale] ?? config[i18n.defaultLocale];

  const isRte = Input === Rte;

  return isRte ? (
    <Rte
      label={label}
      placeholder={placeholder}
      name={name}
      id={name}
      isRequired={isRequired}
      content={values[name] as JSONContent}
      onChange={(json: JSONContent) => {
        setFieldValue(name, json, true);
      }}
      onBlur={() => {
        setFieldTouched(name, true, true);
      }}
      errorMessage={errors[name] as string}
      isInvalid={!!errors[name] && !!touched[name]}
    />
  ) : (
    <Input
      label={label}
      labelPlacement="outside"
      placeholder={placeholder}
      name={name}
      id={name}
      isRequired={isRequired}
      value={values[name] as string}
      onChange={handleChange}
      onBlur={handleBlur}
      errorMessage={errors[name] as string}
      isInvalid={!!errors[name] && !!touched[name]}
    />
  );
}
