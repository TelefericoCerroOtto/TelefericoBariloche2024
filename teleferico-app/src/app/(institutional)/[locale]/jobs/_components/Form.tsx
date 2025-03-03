"use client";

import { sectorOptions } from "@/app/(administration)/dashboard/(sections)/recruitment/_components/data";
import { ButtonDos } from "@/components";
import { useTranslation } from "@/hooks";
import { postulationSchema } from "@/lib/schemas/forms";
import type { PostulationFormData } from "@/types";
import { selectInputStyles } from "@/utils/styles";
import { Input, Select, SelectItem } from "@nextui-org/react";
import { useFormik } from "formik";
import { useCallback, useState } from "react";
import { sendPostulationAction } from "./actions";

export default function Form() {
  const { t } = useTranslation();
  const formIntl = t("components.Forms");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = useCallback(async (values: PostulationFormData) => {
    setIsSubmitting(true);
    try {
      const res = await sendPostulationAction(values);
      if (res.ok) {
        setIsSubmitting(false);
        alert("postulacion enviada");
        return;
      } else {
        setIsSubmitting(false);
        console.log("submit postulation data", res.data);
        alert("Ocurrio un error al enviar la postulacion");
        return;
      }
    } catch (error) {
      setIsSubmitting(false);
      alert("Ocurrio un error al enviar la postulacion");
      console.log("postulation submit error", error);
    }
  }, []);

  const {
    values,
    touched,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
  } = useFormik<PostulationFormData>({
    initialValues: {
      name: "Manuel",
      surname: "Fernandez",
      email: "manu@strapi.io",
      genre: "male",
      resume: undefined as unknown as File,
      age: 27,
      sector: "tech",
    },
    onSubmit,
    validationSchema: postulationSchema,
  });

  return (
    <form
      className="grid flex-grow grid-cols-1 gap-4 lg:grid-cols-2"
      onSubmit={handleSubmit}
    >
      <Input
        id="name"
        name="name"
        autoComplete="off"
        labelPlacement="outside"
        label={formIntl.fields.firstName.label}
        placeholder={formIntl.fields.firstName.placeholder}
        value={values.name}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.name}
        isInvalid={errors.name !== undefined && touched.name}
      />
      <Input
        id="surname"
        name="surname"
        autoComplete="off"
        labelPlacement="outside"
        label={formIntl.fields.lastName.label}
        placeholder={formIntl.fields.lastName.placeholder}
        value={values.surname}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.surname}
        isInvalid={errors.surname !== undefined && touched.surname}
      />
      <Select
        {...selectInputStyles}
        name="genre"
        id="genre"
        label={formIntl.fields.genre.label}
        placeholder={formIntl.fields.genre.placeholder}
        defaultSelectedKeys={[values.genre]}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.genre}
        isInvalid={errors.genre !== undefined && touched.genre}
      >
        <SelectItem key="male">{formIntl.fields.genre.items.male}</SelectItem>
        <SelectItem key="female">
          {formIntl.fields.genre.items.female}
        </SelectItem>
        <SelectItem key="other">{formIntl.fields.genre.items.other}</SelectItem>
      </Select>
      <Input
        id="age"
        name="age"
        label="Edad"
        placeholder="Edad"
        type="number"
        labelPlacement="outside"
        className="rounded-full border"
        onValueChange={(e) => {
          let value = parseInt(e);
          if (value < 0) {
            value = 0;
          }
          setFieldValue("age", value);
        }}
        value={values.age.toString()}
        onBlur={handleBlur}
        errorMessage={errors.age}
        isInvalid={errors.age !== undefined && touched.age}
      />
      <Input
        id="email"
        name="email"
        labelPlacement="outside"
        autoComplete="off"
        label={formIntl.fields.email.label}
        placeholder={formIntl.fields.email.placeholder}
        type="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.email}
        isInvalid={errors.email !== undefined && touched.email}
      />
      <Select
        {...selectInputStyles}
        labelPlacement="outside"
        name="sector"
        id="sector"
        label={formIntl.fields.sector.label}
        placeholder={formIntl.fields.sector.placeholder}
        items={sectorOptions}
        defaultSelectedKeys={[values.sector]}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.sector}
        isInvalid={errors.sector !== undefined && touched.sector}
      >
        {(item) => (
          <SelectItem key={item.key}>
            {formIntl.fields.sector.items[item.key]}
          </SelectItem>
        )}
      </Select>
      <Input
        id="campNo"
        name="campNo"
        type="number"
        labelPlacement="outside"
        label={formIntl.fields.campNo.label}
        placeholder={formIntl.fields.campNo.placeholder}
        onChange={handleChange}
      />
      <Input
        id="resume"
        name="resume"
        type="file"
        labelPlacement="outside"
        label={formIntl.fields.cv.label}
        placeholder={formIntl.fields.cv.placeholder}
        onChange={(e) => setFieldValue("resume", e.target.files?.item(0))}
        accept=".pdf, .doc, .docx, .txt"
      />
      <ButtonDos
        type="submit"
        className="w-[90px]"
        disabled={isSubmitting}
        isLoading={isSubmitting}
      >
        {formIntl.sendbtn}
      </ButtonDos>
    </form>
  );
}
