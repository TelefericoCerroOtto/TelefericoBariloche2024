"use client";

import { ButtonDos, FormError, Honeypot } from "@/components";
import { useAppAlert, useLocale, useTranslation } from "@/hooks";
import { buildPostulationSchema } from "@/lib/schemas";
import type { PostulationFormData, Sector } from "@/types";
import { selectInputStyles } from "@/utils";
import { Input, Select, SelectItem } from "@heroui/react";
import { useFormik } from "formik";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { sendPostulationAction } from "./actions";
import { translations } from "./data";
import Fallback from "./Fallback";

interface Props {
  sectors: Sector[];
}

export default function Form(props: Props) {
  const { sectors } = props;
  const { data, error, loading } = useTranslation("forms");
  const { locale } = useLocale();
  const [token, setToken] = useState<string | null>(null);
  const { showAlert } = useAppAlert();
  const [honeypot, setHoneypot] = useState("");
  const [formLoadedAt, setFormLoadedAt] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const resumeRef = useRef<HTMLInputElement | null>(null);

  const onSubmit = async (values: PostulationFormData) => {
    if (isSubmitting) return;
    if (!token) return;
    setIsSubmitting(true);
    try {
      const res = await sendPostulationAction(token, {
        ...values,
        honeypot,
        formLoadedAt,
      });

      if (res.success) {
        setIsSubmitting(false);
        showAlert({
          title: translations[locale].success.title,
          message: translations[locale].success.message,
          variant: "success",
        });
        setToken(null);
        setHoneypot("");
        setFormLoadedAt(Date.now());
        recaptchaRef.current?.reset();
        resetForm();
        return;
      } else {
        setIsSubmitting(false);
        console.log("submit postulation error: ", res);
        const code = res.data?.code;
        if (code === "INVALID_FORM_AGE") {
          showAlert({
            variant: "warning",
            title: translations[locale].reload.title,
            message: translations[locale].reload.message,
          });
          window.location.reload();
          return;
        }

        if (code === "CAPTCHA_FAILED") {
          showAlert({
            variant: "danger",
            title: translations[locale].captchaFailed.title,
            message: translations[locale].captchaFailed.message,
          });
          recaptchaRef.current?.reset();
          return;
        }

        showAlert({
          title: translations[locale].failed.title,
          message: translations[locale].failed.message,
          variant: "warning",
        });
        return;
      }
    } catch (error) {
      setIsSubmitting(false);
      showAlert({
        title: translations[locale].failed.title,
        message: translations[locale].failed.message,
        variant: "danger",
      });
      console.log("postulation submit error", error);
    }
  };

  const {
    values,
    touched,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldTouched,
    resetForm,
    validateForm,
  } = useFormik<PostulationFormData>({
    initialValues: {
      name: "Manuel",
      surname: "Fernandez",
      email: "manu@strapi.io",
      gender: "male",
      resume: undefined as unknown as File,
      age: 27,
      sector: sectors[0]?.key || "",
    },
    onSubmit,
    validationSchema: buildPostulationSchema(locale),
  });

  if (error)
    return <FormError message={translations[locale].translationError} />;
  if (loading) return <Fallback />;

  const formIntl = data!.data[0].jsonValue;

  return (
    <form className="grid flex-grow grid-cols-1 gap-4" onSubmit={handleSubmit}>
      <Honeypot
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
      />
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
        isRequired
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
        isRequired
      />
      <Select
        {...selectInputStyles}
        name="gender"
        id="gender"
        label={formIntl.fields.gender.label}
        placeholder={formIntl.fields.gender.placeholder}
        defaultSelectedKeys={[values.gender]}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.gender}
        isInvalid={errors.gender !== undefined && touched.gender}
        isRequired
      >
        <SelectItem key="male">{formIntl.fields.gender.items.male}</SelectItem>
        <SelectItem key="female">
          {formIntl.fields.gender.items.female}
        </SelectItem>
        <SelectItem key="other">
          {formIntl.fields.gender.items.other}
        </SelectItem>
      </Select>
      <Input
        id="age"
        name="age"
        label={formIntl.fields.age.label}
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
        isRequired
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
        isRequired
      />
      <Select
        {...selectInputStyles}
        labelPlacement="outside"
        name="sector"
        id="sector"
        label={formIntl.fields.sector.label}
        placeholder={formIntl.fields.sector.placeholder}
        disallowEmptySelection
        items={sectors}
        value={[values.sector]}
        defaultSelectedKeys={[values.sector]}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.sector}
        isInvalid={errors.sector !== undefined && touched.sector}
        isRequired
      >
        {(item) => (
          <SelectItem key={item.documentId}>
            {item.sector_names[0].name}
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
        onBlur={handleBlur}
        errorMessage={errors.campNo}
        isInvalid={errors.campNo !== undefined && touched.campNo}
      />
      <Input
        id="resume"
        name="resume"
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        ref={resumeRef}
        classNames={{
          input: "text-foreground font-medium", // texto del archivo
          label: "text-foreground", // label
          inputWrapper: "cursor-pointer", // mano al pasar el mouse
        }}
        endContent={
          <div className="flex items-center gap-1">
            {/* Botón limpiar con cruz */}
            {values.resume && (
              <button
                type="button"
                onClick={async () => {
                  await setFieldValue("resume", null, true);
                  await setFieldTouched("resume", true, true);
                  resumeRef.current!.value = "";
                }}
                disabled={isSubmitting}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-default-300 text-xs font-bold text-danger-500 hover:bg-danger-50"
                aria-label={"Limpiar archivo seleccionado"}
              >
                <X />
              </button>
            )}
          </div>
        }
        label={formIntl.fields.cv.label}
        onChange={async (event) => {
          const file = event.target.files?.[0] ?? null;

          await setFieldValue("resume", file, true);
          await setFieldTouched("resume", true, true);
        }}
        onBlur={handleBlur}
        disabled={isSubmitting}
        isInvalid={!!errors.resume && !!touched.resume}
        errorMessage={errors.resume as string}
        isRequired
      />
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ""}
        onChange={(token) => {
          validateForm();
          setToken(token);
        }}
      />
      <ButtonDos
        type="submit"
        className="w-[90px]"
        disabled={
          isSubmitting ||
          !token ||
          Object.keys(errors).length > 0 ||
          values.name === ""
        }
        isLoading={isSubmitting}
      >
        {formIntl.buttons.send}
      </ButtonDos>
    </form>
  );
}
