"use client";

import { ButtonDos, FormError, InputSkeleton } from "@/components";
import { useLocale, useTranslation } from "@/hooks";
import { ContactFormData } from "@/types";
import { getLocaleSchema } from "@/utils/get-locale.schema";
import { Input, Textarea } from "@nextui-org/react";
import { useFormik } from "formik";

export default function Form() {
  const { data, error, loading } = useTranslation("forms");
  const { language } = useLocale();
  const onSubmit = async (values: ContactFormData) => {
    console.log(values);
  };
  const { values, handleChange, errors, handleSubmit } =
    useFormik<ContactFormData>({
      initialValues: { name: "", email: "", consultation: "" },
      onSubmit,
      validateOnChange: false,
      validateOnBlur: false,
      validationSchema: getLocaleSchema(language, "contactSchema"),
    });

  if (error)
    return (
      <FormError message="No se pudo recuperar el contenido de la formulario" />
    );

  if (loading)
    return (
      <div className="grid flex-grow grid-cols-1 gap-4">
        <InputSkeleton />
        <InputSkeleton />
        <InputSkeleton />
      </div>
    );

  const formIntl = data!.data[0].jsonValue;

  return (
    <form className="grid flex-grow grid-cols-1 gap-4" onSubmit={handleSubmit}>
      <Input
        id="name"
        name="name"
        onChange={handleChange}
        value={values.name}
        label={formIntl.fields["name"].label}
        labelPlacement="outside"
        placeholder={formIntl.fields["name"].placeholder}
        errorMessage={errors.name}
        isInvalid={!!errors.name}
      />
      <Input
        id="email"
        name="email"
        onChange={handleChange}
        value={values.email}
        label={formIntl.fields["email"].label}
        labelPlacement="outside"
        placeholder={formIntl.fields["email"].placeholder}
        errorMessage={errors.email}
        isInvalid={!!errors.email}
        type="email"
      />
      <Textarea
        id="consultation"
        name="consultation"
        onChange={handleChange}
        value={values.consultation}
        label={formIntl.fields["consultation"].label}
        labelPlacement="outside"
        placeholder={formIntl.fields["consultation"].placeholder}
        errorMessage={errors.consultation}
        isInvalid={!!errors.consultation}
      />
      <ButtonDos type="submit" className="w-[90px]">
        {formIntl.buttons.send}
      </ButtonDos>
    </form>
  );
}
