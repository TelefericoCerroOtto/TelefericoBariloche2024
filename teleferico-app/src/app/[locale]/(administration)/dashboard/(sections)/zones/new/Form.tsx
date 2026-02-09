"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
  TimeInput,
} from "@/components";
import { useAppAlert, useFormLocaleSelector } from "@/hooks";
import { validateZoneLabelAvailability } from "@/lib/actions";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import {
  formInputClassNames,
  formTimeInputClassNames,
} from "@/lib/constants/styles.const";
import { createZoneSchema } from "@/lib/schemas";
import type { CreateZoneFormData } from "@/types/forms";
import { Input, Spinner, Switch, Tooltip } from "@heroui/react";
import { Time } from "@internationalized/date";
import { useFormik } from "formik";
import debounce from "just-debounce-it";
import { Check, Info, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { descConfig, nameConfig } from "../_components/data";
import { createZoneAction } from "./actions";

type LabelStatus = "idle" | "validating" | "available" | "unavailable";
const LABEL_TOOLTIP_TEXT =
  "Es un nombre único para identificar esta zona. Se usa para organizar y conectar información del sistema. Una vez creada, no se puede cambiar. Solo puede contener letras minúsculas. Sugerencia: Use una sola palabra en inglés que describa la zona. Ej.: restaurant, terrace, cabin.";

export default function Form() {
  const [timeInputLoading, setTimeInputLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [labelStatus, setLabelStatus] = useState<LabelStatus>("idle");

  // Error de disponibilidad separado de Yup (no uso setFieldError).
  // Esto evita “pisar” errores del schema o borrarlos accidentalmente.
  const [labelAvailabilityMessage, setLabelAvailabilityMessage] = useState<
    string | undefined
  >(undefined);

  // Contador para evitar race conditions (respuesta vieja pisa respuesta nueva).
  const lastValidationIdRef = useRef(0);

  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();
  const router = useRouter();
  const { showAlert } = useAppAlert();

  const onSubmit = async (values: CreateZoneFormData) => {
    setIsSubmitting(true);
    try {
      const res = await createZoneAction(values);
      if (res.success) {
        showAlert({
          title: "Éxito",
          message: "Zona actualizada exitosamente",
          variant: "success",
        });
        return router.push(ADMIN_ROUTES.ZONES);
      }
      setIsSubmitting(false);
      console.log(res.message);
      showAlert({
        title: "Error",
        message: `Ocurrió un error inesperado al actualizar la zona ${values["zoneName_es-AR"]}`,
        variant: "danger",
      });
      return;
    } catch (error) {
      setIsSubmitting(false);
      console.log("new access ticket submit error: ", error);
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
    dirty,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldTouched,
  } = useFormik<CreateZoneFormData>({
    initialValues: {
      "zoneName_es-AR": "",
      zoneName_en: "",
      openTime: {
        hour: 0,
        mins: 0,
      },
      closeTime: {
        hour: 0,
        mins: 0,
      },
      zoneName_pt: "",
      isOpen: false,
      label: "",
      featured: false,
    },
    validationSchema: createZoneSchema,
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
        await createZoneSchema.validateAt("label", { label });
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
        const isAvailable = await validateZoneLabelAvailability(label);

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
      className="flex flex-col gap-6 overflow-scroll"
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
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />

      <InputLocaleWrapper
        Input={Input}
        config={descConfig}
        formik={{ values, errors, touched, setFieldTouched, setFieldValue }}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
      />

      <TimeInput
        name="openTime"
        id="openTime"
        label="Horario De Apertura"
        labelPlacement="outside"
        classNames={formTimeInputClassNames}
        hourCycle={24}
        value={new Time(values.openTime.hour, values.openTime.mins)}
        onChange={(value) => {
          const newValue = { hour: value?.hour, mins: value?.minute };
          setFieldValue("openTime", newValue);
        }}
        ref={(el) => {
          if (el) setTimeInputLoading(false);
        }}
      />

      <TimeInput
        name="closeTime"
        id="closeTime"
        label="Horario De Cierre"
        labelPlacement="outside"
        classNames={formTimeInputClassNames}
        hourCycle={24}
        value={new Time(values.closeTime.hour, values.closeTime.mins)}
        onChange={(value) => {
          const newValue = { hour: value?.hour, mins: value?.minute };
          setFieldValue("closeTime", newValue);
        }}
        ref={(el) => {
          if (el) setTimeInputLoading(false);
        }}
      />

      <Switch
        name="isOpen"
        id="isOpen"
        isSelected={values.isOpen}
        onChange={handleChange}
      >
        {values.isOpen ? "Abierto al público" : "Cerrado al público"}
      </Switch>

      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.ZONES}
        disableSubmitButton={
          // CHANGE: agrego condiciones para evitar submit mientras valida disponibilidad
          // o si quedó marcada como no disponible.
          !dirty ||
          Object.keys(errors).length > 0 ||
          timeInputLoading ||
          labelStatus === "validating" ||
          labelStatus === "unavailable"
        }
      />
    </form>
  );
}
