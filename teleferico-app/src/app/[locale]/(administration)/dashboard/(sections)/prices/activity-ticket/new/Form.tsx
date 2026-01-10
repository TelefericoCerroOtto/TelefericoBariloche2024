"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
} from "@/components";
import { useAppAlert, useFormLocaleSelector } from "@/hooks";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import {
  formInputClassNames,
  selectInputStyles,
} from "@/lib/constants/styles.const";
import { createActivitySchema } from "@/lib/schemas";
import type { CreateActivityFormData } from "@/types";
import {
  Input,
  NumberInput,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Textarea,
  Tooltip,
} from "@heroui/react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { seasonOptions } from "../data";
import { createActivityAction } from "./actions";
import { descConfig, nameConfig, requirementsConfig } from "./data";
import { Check, Info, Tag, X } from "lucide-react";
import debounce from "just-debounce-it";
import { validateActivityLabelAvailability } from "@/lib/actions";

type LabelStatus = "idle" | "validating" | "available" | "unavailable";
const LABEL_TOOLTIP_TEXT =
  "Es un nombre único para identificar esta actividad. Se usa para organizar y conectar información del sistema. Una vez creada, no se puede cambiar. Solo puede contener letras minúsculas. Sugerencia: Use una sola palabra en inglés que describa la actividad. Ej.: sledge, circuit, hiking.";

export default function Form() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [labelStatus, setLabelStatus] = useState<LabelStatus>("idle");
  // Error de disponibilidad separado de Yup (no uso setFieldError).
  // Esto evita “pisar” errores del schema o borrarlos accidentalmente.
  const [labelAvailabilityMessage, setLabelAvailabilityMessage] = useState<
    string | undefined
  >(undefined);
  // Contador para evitar race conditions (respuesta vieja pisa respuesta nueva).
  const lastValidationIdRef = useRef(0);

  const router = useRouter();
  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();
  const { showAlert } = useAppAlert();

  const onSubmit = async (values: CreateActivityFormData) => {
    try {
      setIsSubmitting(true);
      const res = await createActivityAction(values);
      if (res.success) {
        showAlert({
          title: "Éxito",
          message: "Nueva actividad creada exitosamente",
          variant: "success",
        });
        return router.push(`${ADMIN_ROUTES.PRICES}?selected=activities`);
      }
      setIsSubmitting(false);
      console.log(res.message);
      showAlert({
        title: "Error",
        message: "Ocurrió un error al crear la actividad",
        variant: "danger",
      });
      return;
    } catch (error) {
      setIsSubmitting(false);
      console.log("new activity ticket submit error: ", error);
      showAlert({
        title: "Error",
        message: "Ocurrió un error al enviar el formulario",
        variant: "danger",
      });
    }
  };

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldTouched,
  } = useFormik<CreateActivityFormData>({
    initialValues: {
      label: "",
      "activityName_es-AR": "",
      activityName_en: "",
      activityName_pt: "",
      "description_es-AR": "",
      description_en: "",
      description_pt: "",
      "requirements_es-AR": "",
      requirements_en: "",
      requirements_pt: "",
      price: 0,
      minAge: 0,
      season: "allSeasons",
      available: true,
    },
    validationSchema: createActivitySchema,
    onSubmit,
  });

  // Debounced validator con guardas (no valida vacío, ni < 2 chars),
  // manejo de undefined, y protección contra race conditions.
  const debouncedLabelValidate = useMemo(() => {
    return debounce(async (rawLabel: string) => {
      const label = rawLabel.trim();

      // Si está vacío: estado neutral (Tag).
      if (!label) {
        setLabelStatus("idle");
        setLabelAvailabilityMessage(undefined);
        return;
      }

      // gate usando el schema real de Yup para NO duplicar reglas
      try {
        await createActivitySchema.validateAt("label", { label });
      } catch {
        // Si no pasa Yup (min/max/regex/required), no validamos disponibilidad
        // y no mostramos error de disponibilidad (solo el del schema).
        lastValidationIdRef.current++;
        setLabelStatus("idle");
        setLabelAvailabilityMessage(undefined);
        return;
      }

      const validationId = ++lastValidationIdRef.current;

      setLabelStatus("validating");
      setLabelAvailabilityMessage(undefined);

      try {
        const isAvailable = await validateActivityLabelAvailability(label);

        // Si llegó tarde una respuesta vieja, la ignoramos.
        if (validationId !== lastValidationIdRef.current) return;

        // Puede devolver undefined si res.ok === false.
        // En ese caso, vuelvo a neutral para no mostrar una X engañosa.
        if (typeof isAvailable !== "boolean") {
          setLabelStatus("idle");
          setLabelAvailabilityMessage(undefined);
          return;
        }

        if (isAvailable) {
          setLabelStatus("available");
          setLabelAvailabilityMessage(undefined);
        } else {
          setLabelStatus("unavailable");
          setLabelAvailabilityMessage(
            "Esta etiqueta no está disponible, intente otra.",
          );
        }
      } catch (error) {
        // Ante error de red/servidor: no marco “no disponible” (sería falso).
        console.log("validate zone label availability error: ", error);

        if (validationId !== lastValidationIdRef.current) return;

        setLabelStatus("idle");
        setLabelAvailabilityMessage(undefined);
      }
    }, 500);
  }, []);

  // Cleanup del debounce al desmontar (evita setState después de un unmount).
  useEffect(() => {
    return () => {
      // Algunas versiones exponen .cancel(). Si no existe, no rompe.
      debouncedLabelValidate.cancel?.();
    };
  }, [debouncedLabelValidate]);

  // endContent estrictamente según la UX.
  // Nota: uso values.label, no errors.label.
  // CHANGE: endContent con colores explícitos para los estados finales.
  // - X roja
  // - Check verde
  const labelEndContent = useMemo(() => {
    const hasText = values.label.trim().length > 0;

    if (!hasText) return <Tag size={18} className="text-default-400" />;
    if (labelStatus === "validating") return <Spinner size="sm" />;

    if (labelStatus === "available")
      return <Check size={18} className="text-success" />; // CHANGE: verde

    if (labelStatus === "unavailable")
      return <X size={18} className="text-danger" />; // CHANGE: rojo

    return <Tag size={18} className="text-default-400" />;
  }, [values.label, labelStatus]);

  // isInvalid y errorMessage combinan Yup + disponibilidad,
  // sin mezclar errores async dentro de errors.label.
  const labelIsInvalid =
    (!!touched.label && !!errors.label) || labelStatus === "unavailable";

  const labelErrorMessage =
    (touched.label && errors.label) || labelAvailabilityMessage;

  return (
    <form
      className="flex flex-col gap-5 overflow-scroll"
      onSubmit={handleSubmit}
    >
      <FormLocaleSelector
        selectedKeys={selectedKeys}
        handleSelectionChange={handleSelectionChange}
      />

      <Input
        id="label"
        name="label"
        labelPlacement="outside"
        placeholder="Ej.: restaurant"
        classNames={formInputClassNames}
        label={
          <div className="flex items-center gap-2">
            <span>Etiqueta</span>
            <span className="font-bold text-red-600">*</span>

            {/* Tooltip junto al label */}
            <Tooltip content={LABEL_TOOLTIP_TEXT} placement="right">
              <span
                className="inline-flex cursor-pointer font-bold text-blue-600"
                aria-label="Información sobre el campo etiqueta"
              >
                <Info size={18} />
              </span>
            </Tooltip>
          </div>
        }
        endContent={labelEndContent}
        onChange={(evt) => {
          handleChange(evt);

          // CHANGE: reseteo rápido si el usuario borra todo.
          const nextValue = evt.target.value;
          if (!nextValue.trim()) {
            // invalido validaciones en vuelo
            lastValidationIdRef.current++;
            setLabelStatus("idle");
            setLabelAvailabilityMessage(undefined);
          }

          debouncedLabelValidate(nextValue);
        }}
        onBlur={handleBlur}
        isInvalid={labelIsInvalid}
        errorMessage={labelErrorMessage}
      />

      <InputLocaleWrapper
        Input={Input}
        config={nameConfig}
        formik={{ values, errors, touched, setFieldTouched, setFieldValue }}
        isRequired
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />

      <InputLocaleWrapper
        Input={Textarea}
        config={descConfig}
        formik={{ values, errors, touched, setFieldTouched, setFieldValue }}
        isRequired
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />

      <InputLocaleWrapper
        Input={Input}
        config={requirementsConfig}
        formik={{ values, errors, touched, setFieldTouched, setFieldValue }}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />

      <NumberInput
        label="Precio Por Persona"
        labelPlacement="outside"
        name="price"
        id="price"
        type="number"
        classNames={formInputClassNames}
        hideStepper
        value={values.price}
        onChange={(value) => {
          if (typeof value === "number") setFieldValue("price", value);
        }}
      />

      <NumberInput
        label="Edad mínima"
        labelPlacement="outside"
        name="minAge"
        id="minAge"
        type="number"
        classNames={formInputClassNames}
        hideStepper
        value={values.minAge}
        onChange={(value) => {
          if (typeof value === "number") setFieldValue("minAge", value);
        }}
      />

      <Select
        name="season"
        id="season"
        placeholder="Seleccione una temporada"
        label="Temporada"
        labelPlacement="outside"
        radius="full"
        variant="flat"
        className="rounded-full"
        classNames={selectInputStyles.classNames}
        defaultSelectedKeys={[values.season]}
        onChange={handleChange}
        onBlur={handleBlur}
        isRequired
        disallowEmptySelection
        items={seasonOptions}
      >
        {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
      </Select>

      <Switch
        name="available"
        id="available"
        isSelected={values.available}
        onChange={handleChange}
      >
        {values.available ? "Actividad habilitada" : "Cerrada al público"}
      </Switch>

      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={`${ADMIN_ROUTES.PRICES}?selected=activities`}
        disableSubmitButton={
          isSubmitting ||
          Object.keys(errors).length > 0 ||
          values.activityName_en === ""
        }
      />
    </form>
  );
}
