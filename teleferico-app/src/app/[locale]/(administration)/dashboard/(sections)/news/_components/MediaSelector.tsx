"use client";

import { useProxy } from "@/hooks";
import type { StrapiImage } from "@/types";
import { STRAPI_ENDPOINTS } from "@/utils";
import {
  Button,
  Image as HeroImage,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  useDisclosure,
} from "@heroui/react";
import { useMemo } from "react";
import type { Dispatch } from "react";

interface MediaSelectorChangeEvent {
  documentId: string;
  url?: string;
}

interface Props {
  label: string;
  value: string;
  imageUrl?: string;
  error?: string;
  onChange: Dispatch<MediaSelectorChangeEvent>;
}

const PAGE_SIZE = 30;

const resolveUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = process.env.NEXT_PUBLIC_STRAPI_URL ?? "";
  return base ? `${base}${url}` : url;
};

export default function MediaSelector(props: Props) {
  const { label, value, imageUrl, error, onChange } = props;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const query = useMemo(
    () => ({
      "pagination[pageSize]": PAGE_SIZE,
    }),
    [],
  );

  const { data, isLoading } = useProxy<StrapiImage[]>(
    STRAPI_ENDPOINTS.UPLOAD_FILES,
    query,
    {
      revalidateOnFocus: false,
    },
  );

  const items = Array.isArray(data) ? data : [];
  const previewUrl = resolveUrl(imageUrl);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium" htmlFor={label}>
            {label}
          </label>
          <input
            id={label}
            className="mt-1 w-full rounded-full border border-custom-border px-4 py-2"
            value={value}
            onChange={(event) =>
              onChange({ documentId: event.target.value ?? "" })
            }
          />
          {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
        </div>
        <Button variant="flat" color="primary" onPress={onOpen}>
          Seleccionar
        </Button>
      </div>
      {previewUrl ? (
        <div className="h-32 w-full overflow-hidden rounded-lg border border-dashed border-default-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Vista previa de la imagen seleccionada"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="4xl" scrollBehavior="outside">
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Seleccionar imagen
              </ModalHeader>
              <ModalBody>
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Spinner label="Cargando biblioteca" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {items.map((item) => (
                      <button
                        key={item.documentId}
                        type="button"
                        className="flex flex-col items-center gap-2 rounded-lg border border-transparent p-2 transition hover:border-primary"
                        onClick={() => {
                          onChange({
                            documentId: item.documentId,
                            url: resolveUrl(item.url),
                          });
                          close();
                        }}
                      >
                        <HeroImage
                          src={item.url}
                          alt={item.alternativeText ?? item.name}
                          className="h-32 w-full rounded-md object-cover"
                        />
                        <span className="text-xs font-medium" title={item.name}>
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={close}>
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
