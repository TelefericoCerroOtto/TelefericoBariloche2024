"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
  MediaSelector,
  Rte,
} from "@/components";
import { useFormLocaleSelector } from "@/hooks";
import { i18n } from "@/i18n";
import { newsFormSchema } from "@/lib/schemas";
import type { NewsFormData } from "@/types";
import { ADMIN_ROUTES } from "@/utils";
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
import {
  briefConfig,
  coverAltConfig,
  bodyConfig,
  titleConfig,
} from "../_components/data";
import { deleteNewsAction, updateNewsAction } from "./actions";

interface Props {
  initialValues?: NewsFormData;
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
  });

  base.coverImage = "";
  base.coverImageUrl = "";
  base.coverImageFile = null;

  return base as NewsFormData;
};

export default function NewsForm(props: Props) {
  const { initialValues } = props;
  const router = useRouter();
  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const formInitialValues = useMemo(() => {
    if (initialValues) {
      return {
        ...initialValues,
        coverImageFile: initialValues.coverImageFile ?? null,
      };
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
    setFieldTouched,
    dirty,
  } = useFormik<NewsFormData>({
    initialValues: formInitialValues,
    validationSchema: newsFormSchema,
    enableReinitialize: true,
    onSubmit: async (formValues) => {
      setIsSubmitting(true);
      try {
        const res = await updateNewsAction(formValues);
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

  const disableSubmitButton =
    isSubmitting || Object.keys(errors).length > 0 || !dirty;

  const handleDelete = async () => {
    if (!deleteNewsAction || !values.documentId) return;
    setIsSubmitting(true);
    try {
      const res = await deleteNewsAction(values.documentId);
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
      <InputLocaleWrapper
        Input={Input}
        config={titleConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <InputLocaleWrapper
        Input={Rte}
        config={bodyConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <InputLocaleWrapper
        Input={Rte}
        config={briefConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <InputLocaleWrapper
        Input={Input}
        config={coverAltConfig}
        values={values}
        errors={errors}
        touched={touched}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <MediaSelector
        name="coverImageFile"
        label="Imagen de portada"
        value={values.coverImageFile ?? null}
        defaultPreviewUrl={values.coverImageUrl || null}
        onChange={(file) => {
          setFieldValue("coverImageFile", file);
          setFieldTouched("coverImageFile", true, false);
          if (file) {
            setFieldValue("coverImage", "");
            setFieldValue("coverImageUrl", "");
          } else {
            setFieldValue("coverImage", initialValues?.coverImage ?? values.coverImage ?? "");
            setFieldValue("coverImageUrl", initialValues?.coverImageUrl ?? "");
          }
        }}
        isRequired
        disabled={isSubmitting}
        isInvalid={
          (!!errors.coverImageFile && (!!touched.coverImageFile || isSubmitting)) ||
          (!!errors.coverImage && (!!touched.coverImage || isSubmitting))
        }
        errorMessage={
          (touched.coverImageFile || isSubmitting) && errors.coverImageFile
            ? (errors.coverImageFile as string)
            : (touched.coverImage || isSubmitting) && errors.coverImage
              ? (errors.coverImage as string)
              : undefined
        }
        maxSizeMB={5}
      />
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
      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.NEWS}
        disableSubmitButton={disableSubmitButton}
      />
      {values.documentId ? (
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
                <Button
                  color="danger"
                  onPress={() => {
                    close();
                    handleDelete();
                  }}
                >
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
