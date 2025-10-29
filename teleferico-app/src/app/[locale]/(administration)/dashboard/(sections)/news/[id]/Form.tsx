"use client";

import {
  FormButtons,
  FormLocaleSelector,
  InputLocaleWrapper,
  MediaSelector,
  Rte,
} from "@/components";
import { useFormLocaleSelector } from "@/hooks";
import { updateNewSchema } from "@/lib/schemas";
import type { UpdateNewFormData } from "@/types";
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
import { useState } from "react";
import { bodyConfig, briefConfig, titleConfig } from "../_components/data";
import { Trash } from "lucide-react";
import { deleteNewsAction, updateNewsAction } from "./actions";

interface Props {
  initialValues: UpdateNewFormData;
}

export default function NewsForm(props: Props) {
  const { initialValues } = props;
  const router = useRouter();
  const { locale, selectedKeys, handleSelectionChange } =
    useFormLocaleSelector();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
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
  } = useFormik<UpdateNewFormData>({
    initialValues,
    validationSchema: updateNewSchema,
    enableReinitialize: true,
    onSubmit: async (formValues) => {
      setIsSubmitting(true);
      try {
        const res = await updateNewsAction(formValues);
        if (res.success) {
          addToast({
            title: "Noticia actualizada.",
            color: "success",
            timeout: 2500,
          });
          router.push(ADMIN_ROUTES.NEWS);
        } else {
          addToast({
            title: "Ocurrió un error al actualizar la noticia.",
            color: "danger",
            timeout: 3000,
          });
          console.error(
            "create/update news error: ",
            res.message,
            " -> ",
            res.data,
          );
          setIsSubmitting(false);
        }
      } catch (error) {
        console.error("news form submit error", error);
        addToast({
          title: "Ocurrió un error inesperado al actualizar la noticia.",
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
        formik={{ values, setFieldValue, setFieldTouched, errors, touched }}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <InputLocaleWrapper
        Input={Rte}
        config={bodyConfig}
        formik={{ values, setFieldValue, setFieldTouched, errors, touched }}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <InputLocaleWrapper
        Input={Rte}
        config={briefConfig}
        formik={{ values, setFieldValue, setFieldTouched, errors, touched }}
        handleChange={handleChange}
        handleBlur={handleBlur}
        locale={locale}
        isRequired
      />
      <MediaSelector
        name="coverImageFile"
        label="Imagen de portada"
        defaultPreviewUrl={values.coverImage.url}
        defaultName={values.coverImage.name}
        onChange={(file) => {
          setFieldValue("newCoverImageFile", file, true);
          setFieldTouched("newCoverImageFile", true, true);
        }}
        isRequired
        disabled={isSubmitting}
        isInvalid={
          touched.newCoverImageFile &&
          !!errors.newCoverImageFile &&
          Object.keys(errors?.coverImage || {}).length > 0
        }
        errorMessage={errors.newCoverImageFile}
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
        id="highlighted"
        name="highlighted"
        isSelected={values.highlighted}
        onChange={handleChange}
      >
        Noticia destacada
      </Checkbox>
      {values.documentId ? (
        <div className="mt-4 flex justify-center">
          <Button
            color="danger"
            variant="ghost"
            onPress={onOpen}
            startContent={<Trash />}
            isDisabled={isSubmitting}
          >
            Eliminar noticia
          </Button>
        </div>
      ) : null}
      <FormButtons
        isSubmitting={isSubmitting}
        cancelRedirectRoute={ADMIN_ROUTES.NEWS}
        disableSubmitButton={disableSubmitButton}
      />
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
                    handleDelete();
                    close();
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
