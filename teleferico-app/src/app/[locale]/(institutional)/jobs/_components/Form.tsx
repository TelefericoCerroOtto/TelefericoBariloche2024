"use client";

import { ButtonDos, CustomLink, FormError, Honeypot } from "@/components";
import { useAppAlert, useLocale, useTranslation } from "@/hooks";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import { selectInputStyles } from "@/lib/constants/styles.const";
import { formInputClassNames } from "@/lib/constants/styles.const";
import { MAX_EMAIL_LENGTH } from "@/lib/schemas/forms/constants";
import { buildPostulationSchema } from "@/lib/schemas";
import type { PostulationFormData, Sector } from "@/types";
import { Input, Select, SelectItem, Textarea } from "@heroui/react";
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
  const hasActiveSectors = sectors.length > 0;
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
        if (resumeRef.current) {
          resumeRef.current.value = "";
        }
        return;
      } else {
        setIsSubmitting(false);
        console.log("submit postulation error: ", res);
        const code = res.data?.code;

        switch (code) {
          case "INVALID_FORM_AGE":
            showAlert({
              variant: "warning",
              title: translations[locale].reload.title,
              message: translations[locale].reload.message,
            });
            window.location.reload();
            break;

          case "CAPTCHA_FAILED":
            showAlert({
              variant: "danger",
              title: translations[locale].captchaFailed.title,
              message: translations[locale].captchaFailed.message,
            });
            recaptchaRef.current?.reset();
            break;

          case "CAPTCHA_MISSING":
            showAlert({
              variant: "danger",
              title: translations[locale].captchaMissing.title,
              message: translations[locale].captchaMissing.message,
            });
            recaptchaRef.current?.reset();
            break;

          case "TOO_MANY_REQUESTS":
            showAlert({
              variant: "warning",
              title: translations[locale].tooManyRequests.title,
              message: translations[locale].tooManyRequests.message,
            });
            break;

          default:
            showAlert({
              title: translations[locale].failed.title,
              message: translations[locale].failed.message,
              variant: "warning",
            });
            break;
        }
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
    submitCount,
    setFieldTouched,
    setFieldValue,
    resetForm,
    validateForm,
  } = useFormik<PostulationFormData>({
    initialValues: {
      name: "",
      surname: "",
      email: "",
      gender: "" as PostulationFormData["gender"],
      age: undefined as unknown as PostulationFormData["age"],
      resume: undefined as unknown as File,
      note: "",
      sector: "",
    },
    onSubmit,
    validationSchema: buildPostulationSchema(locale),
  });

  if (error)
    return <FormError message={translations[locale].translationError} />;
  if (loading) return <Fallback />;

  if (!hasActiveSectors) {
    return <FormError message={translations[locale].sectorEmpty} />;
  }

  const formIntl = data!.data[0].jsonValue;
  const privacyNotice =
    formIntl.privacyNotice ?? translations[locale].privacyNotice;
  const genderHasError =
    Boolean(errors.gender) && (Boolean(touched.gender) || submitCount > 0);
  const sectorHasError =
    Boolean(errors.sector) && (Boolean(touched.sector) || submitCount > 0);

  return (
    <form
      className="grid flex-grow grid-cols-1 gap-4"
      noValidate
      onSubmit={handleSubmit}
    >
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
        classNames={formInputClassNames}
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
        classNames={formInputClassNames}
      />
      <Select
        {...selectInputStyles}
        labelPlacement="outside-top"
        name="gender"
        id="gender"
        label={formIntl.fields.gender.label}
        placeholder={formIntl.fields.gender.placeholder}
        selectedKeys={values.gender ? [values.gender] : []}
        onSelectionChange={(keys) => {
          if (keys === "all") return;

          const [selectedKey] = Array.from(keys);
          void setFieldValue(
            "gender",
            selectedKey
              ? String(selectedKey)
              : ("" as PostulationFormData["gender"]),
            true,
          );
          void setFieldTouched("gender", true, false);
        }}
        onBlur={handleBlur}
        errorMessage={genderHasError ? errors.gender : undefined}
        isInvalid={genderHasError}
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
          if (e.trim() === "") {
            void setFieldValue(
              "age",
              undefined as unknown as PostulationFormData["age"],
            );
            return;
          }

          let value = parseInt(e, 10);
          if (Number.isNaN(value)) {
            void setFieldValue(
              "age",
              undefined as unknown as PostulationFormData["age"],
            );
            return;
          }

          if (value < 0) {
            value = 0;
          }
          void setFieldValue("age", value);
        }}
        value={
          typeof values.age === "number" && Number.isFinite(values.age)
            ? values.age.toString()
            : ""
        }
        onBlur={handleBlur}
        errorMessage={errors.age}
        isInvalid={errors.age !== undefined && touched.age}
        isRequired
        classNames={formInputClassNames}
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
        maxLength={MAX_EMAIL_LENGTH}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.email}
        isInvalid={errors.email !== undefined && touched.email}
        isRequired
        classNames={formInputClassNames}
      />
      <Select
        {...selectInputStyles}
        labelPlacement="outside-top"
        name="sector"
        id="sector"
        label={formIntl.fields.sector.label}
        placeholder={formIntl.fields.sector.placeholder}
        disallowEmptySelection
        items={sectors}
        selectedKeys={values.sector ? [values.sector] : []}
        onSelectionChange={(keys) => {
          if (keys === "all") return;

          const [selectedKey] = Array.from(keys);
          void setFieldValue(
            "sector",
            selectedKey ? String(selectedKey) : "",
            true,
          );
          void setFieldTouched("sector", true, false);
        }}
        onBlur={handleBlur}
        errorMessage={sectorHasError ? errors.sector : undefined}
        isInvalid={sectorHasError}
        isRequired
      >
        {(item) => (
          <SelectItem key={item.documentId}>
            {item.sector_names?.[0]?.name ?? item.key}
          </SelectItem>
        )}
      </Select>
      <Input
        id="campNo"
        name="campNo"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        labelPlacement="outside"
        label={formIntl.fields.campNo.label}
        placeholder={formIntl.fields.campNo.placeholder}
        value={values.campNo?.toString() ?? ""}
        onKeyDown={(event) => {
          const allowedKeys = [
            "Backspace",
            "Delete",
            "Tab",
            "Escape",
            "Enter",
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
          ];

          if (allowedKeys.includes(event.key)) return;
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          if (!/^[0-9]$/.test(event.key)) {
            event.preventDefault();
          }
        }}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={
          touched.campNo || submitCount > 0 ? errors.campNo : undefined
        }
        isInvalid={Boolean(errors.campNo) && (touched.campNo || submitCount > 0)}
        classNames={formInputClassNames}
      />
      <Textarea
        id="note"
        name="note"
        type="note"
        labelPlacement="outside"
        label={`${formIntl.fields.note.label} (${translations[locale].optional})`}
        placeholder={formIntl.fields.note.placeholder}
        value={values.note}
        onChange={handleChange}
        onBlur={handleBlur}
        errorMessage={errors.note}
        isInvalid={errors.note !== undefined && touched.note}
        classNames={formInputClassNames}
      />
      <Input
        id="resume"
        name="resume"
        type="file"
        accept=".pdf,.doc,.docx"
        ref={resumeRef}
        classNames={{
          ...formInputClassNames,
          input: "text-base text-foreground font-medium", // texto del archivo
          label: "text-base text-foreground", // label
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
                className="flex h-7 w-7 items-center justify-center rounded-full border border-default-300 text-base font-bold text-danger-500 hover:bg-danger-50"
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
      <div className="rounded-2xl border border-default-200 bg-default-50 px-4 py-3 text-sm leading-6 text-foreground-600">
        <p>
          {privacyNotice.beforeLink}{" "}
          <CustomLink
            href={PUBLIC_ROUTES.POSTULATION_PRIVACY}
            className="font-medium text-primary underline underline-offset-4"
            showExternalIcon={false}
          >
            {privacyNotice.linkLabel}
          </CustomLink>{" "}
          {privacyNotice.afterLink}
        </p>
      </div>
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
