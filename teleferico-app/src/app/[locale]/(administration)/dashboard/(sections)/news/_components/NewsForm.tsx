"use client";

import {
  FormButtons,
  FormLocaleSelector,
  LocaleInputField,
} from "@/components";
import { useFormLocaleSelector } from "@/hooks";
import { newsFormSchema } from "@/lib/schemas";
import type { Locales, NewsFormData } from "@/types";
import { ADMIN_ROUTES } from "@/utils";
import { i18n } from "@/i18n";
import {
  addToast,
  Button,
  Checkbox,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import LocaleJsonField from "./LocaleJsonField";
import LocaleMediaSelector from "./LocaleMediaSelector";
import type { createNewsAction } from "../new/actions";
import type {
  deleteNewsAction,
  updateNewsAction,
} from "../[id]/actions";

interface Props {
  initialValues?: NewsFormData;
  onSubmitAction: typeof createNewsAction | typeof updateNewsAction;
  onDeleteAction?: typeof deleteNewsAction;
}

const buildInitialValues = (): NewsFormData => {
  const base: Record<string, unknown> = {
    highglighted: false,
    date: "",
  };

  i18n.locales.forEach((locale) => {
    base[`title_${locale}`] = "";
    base[`body_${locale}`] = "[]";
    base[`brief_${locale}`] = "[]";
    base[`coverAlt_${locale}`] = "";
    base[`coverImage_${locale}`] = "";
    base[`coverImageUrl_${locale}`] = "";
  });

  return base as NewsFormData;
};

export default function NewsForm(props: Props) {
  const { initialValues, onSubmitAction, onDeleteAction } = props;
  const router = useRouter();
  const { locale, selectedKeys, handleSelectionChange } = useFormLocaleSelector();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const formInitialValues = useMemo(() => {
    if (initialValues) {
      return initialValues;
    }
    return buildInitialValues();
  }, [initialValues]);

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    dirty,
  } = useFormik<NewsFormData>({
    initialValues: formInitialValues,
    validationSchema: newsFormSchema,
    enableReinitialize: true,
    onSubmit: async (formValues) => {
      setIsSubmitting(true);
      try {
        const res = await onSubmitAction(formValues);
        if (res.success) {
          addToast({
            title: res.message,
            color: "success",
            timeout: 2500,
          });
          router.push(ADMIN_ROUTES.NEWS);
        } else {
          addToast({
            title: res.message,
            color: "danger",
            timeout: 3000,
          });
          console.error("create/update news error", res.data);
          setIsSubmitting(false);
        }
      } catch (error) {
        console.error("news form submit error", error);
        addToast({
          title: "Ocurrió un error al guardar la noticia.",
          color: "danger",
          timeout: 3000,
        });
        setIsSubmitting(false);
      }
    },
  });

  const localeJsonConfig = useMemo(
    () => ({
      "es-AR": {
        label: "Contenido (Español)",
        placeholder: "Pegá aquí el JSON de bloques de Strapi",
        name: "body_es-AR",
      },
      en: {
        label: "Contenido (Inglés)",
        placeholder: "Paste Strapi blocks JSON here",
        name: "body_en",
      },
      pt: {
        label: "Contenido (Portugués)",
        placeholder: "Cole o JSON de blocos do Strapi aqui",
        name: "body_pt",
      },
    }),
    [],
  );

  const briefConfig = useMemo(
    () => ({
      "es-AR": {
        label: "Bajada (Español)",
        placeholder: "Pegá aquí el JSON de la bajada",
        name: "brief_es-AR",
      },
      en: {
        label: "Bajada (Inglés)",
        placeholder: "Paste the brief JSON here",
        name: "brief_en",
      },
      pt: {
        label: "Bajada (Portugués)",
        placeholder: "Cole o JSON do resumo aqui",
        name: "brief_pt",
      },
    }),
    [],
  );

  const coverAltConfig = useMemo(
    () => ({
      "es-AR": {
        label: "Texto alternativo de la portada (Español)",
        name: "coverAlt_es-AR",
        placeholder: "Descripción de la imagen",
      },
      en: {
        label: "Texto alternativo de la portada (Inglés)",
        name: "coverAlt_en",
        placeholder: "Image description",
      },
      pt: {
        label: "Texto alternativo de la portada (Portugués)",
        name: "coverAlt_pt",
        placeholder: "Descrição da imagem",
      },
    }),
    [],
  );

  const titleConfig = useMemo(
    () => ({
      "es-AR": {
        label: "Título (Español)",
        name: "title_es-AR",
        placeholder: "Ingresá el título en Español",
      },
      en: {
        label: "Título (Inglés)",
        name: "title_en",
        placeholder: "Enter the English title",
      },
      pt: {
        label: "Título (Portugués)",
        name: "title_pt",
        placeholder: "Digite o título em português",
      },
    }),
    [],
  );

  const coverLabelByLocale: Record<Locales, string> = {
    "es-AR": "Imagen de portada",
    en: "Cover image",
    pt: "Imagem de capa",
  };

  const disableSubmitButton =
    isSubmitting || Object.keys(errors).length > 0 || !dirty;

  const handleDelete = async () => {
    if (!onDeleteAction || !values.documentId) return;
    setIsSubmitting(true);
    try {
      const res = await onDeleteAction(values.documentId);
      if (res.success) {
        addToast({
          title: res.message,
          color: "success",
          timeout: 2500,
        });
        router.push(ADMIN_ROUTES.NEWS);
      } else {
        addToast({
          title: res.message,
          color: "danger",
          timeout: 3000,
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("deleteNewsAction error", error);
      addToast({
        title: "Ocurrió un error al eliminar la noticia.",
        color: "danger",
        timeout: 3000,
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-5 overflow-auto" onSubmit={handleSubmit}>
      <FormLocaleSelector
        selectedKeys={selectedKeys}
        handleSelectionChange={handleSelectionChange}
      />
      <LocaleInputField
        config={titleConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <LocaleJsonField
        locale={locale}
        config={localeJsonConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
      />
      <LocaleJsonField
        locale={locale}
        config={briefConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
      />
      <LocaleInputField
        config={coverAltConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <LocaleMediaSelector
        locale={locale}
        values={values}
        errors={errors}
        touched={touched}
        setFieldValue={setFieldValue}
        name={`coverImage_${locale}` as keyof NewsFormData}
        urlField={`coverImageUrl_${locale}` as keyof NewsFormData}
        label={coverLabelByLocale[locale]}
        showErrors={isSubmitting}
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <Input
          type="date"
          label="Fecha de publicación"
          labelPlacement="outside"
          value={values.date}
          name="date"
          onChange={handleChange}
          onBlur={handleBlur}
          errorMessage={touched.date ? (errors.date as string) : undefined}
          isInvalid={!!errors.date && !!touched.date}
          className="max-w-xs"
        />
        <Checkbox
          isSelected={values.highglighted}
          onValueChange={(checked) => setFieldValue("highglighted", checked)}
        >
          Noticia destacada
        </Checkbox>
      </div>
      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.NEWS}
        disableSubmitButton={disableSubmitButton}
      />
      {onDeleteAction && values.documentId ? (
        <div className="mt-4 flex justify-end">
          <Button
            color="danger"
            variant="bordered"
            onPress={onOpen}
            isDisabled={isSubmitting}
          >
            Eliminar noticia
          </Button>
        </div>
      ) : null}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Eliminar noticia
              </ModalHeader>
              <ModalBody>
                <p>
                  ¿Estás seguro de que querés eliminar esta noticia? Esta acción
                  no se puede deshacer.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={close}>
                  Cancelar
                </Button>
                <Button color="danger" onPress={() => {
                  close();
                  handleDelete();
                }}>
                  Eliminar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </form>
  );
}
