"use client";

import { formatBytesToMB } from "@/lib/adapters";
import { cn } from "@/utils";
import { Spinner } from "@heroui/react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { ButtonDos } from "../shared";

export interface MediaSelectorProps {
  id?: string;
  name: string;
  label?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  // eslint-disable-next-line no-unused-vars
  onChange?: (file: File | null) => void;
  value?: File | null;
  defaultPreviewUrl?: string | null;
  maxSizeMB?: number;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

const DEFAULT_ACCEPT = "image/*";
const DEFAULT_ERROR_MESSAGE = "Could not load the image.";

export default function MediaSelector(props: MediaSelectorProps) {
  const {
    id,
    name,
    label = "Cargar archivo",
    isRequired,
    isInvalid,
    errorMessage,
    disabled,
    onChange,
    value,
    defaultPreviewUrl = null,
    maxSizeMB,
    accept = DEFAULT_ACCEPT,
    multiple = false,
    className,
  } = props;

  const generatedId = useId();
  const inputId = id ?? `${name}-${generatedId}`;
  const errorId = `${inputId}-error`;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const isControlled = value !== undefined;
  const [internalFile, setInternalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    defaultPreviewUrl,
  );
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const file = isControlled ? (value ?? null) : internalFile;

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeObjectUrl();
    };
  }, [revokeObjectUrl]);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      revokeObjectUrl();
      objectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
      setIsPreviewLoading(true);
      setLocalError(null);
      return;
    }

    revokeObjectUrl();
    setPreviewUrl(defaultPreviewUrl ?? null);
    setIsPreviewLoading(false);
  }, [file, defaultPreviewUrl, revokeObjectUrl]);

  const updateFile = useCallback(
    (nextFile: File | null) => {
      if (!isControlled) {
        setInternalFile(nextFile);
      }
      onChange?.(nextFile);
    },
    [isControlled, onChange],
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    const selectedFile = files && files.length > 0 ? files[0] : null;

    if (
      selectedFile &&
      maxSizeMB &&
      selectedFile.size > maxSizeMB * 1024 * 1024
    ) {
      setLocalError(
        `El archivo seleccionado es demasiado grande. El tamaño maximo es de ${maxSizeMB} MB (Cargado ${formatBytesToMB(selectedFile.size)} MB).`,
      );
      updateFile(null);
      setIsPreviewLoading(false);
      revokeObjectUrl();
      setPreviewUrl(defaultPreviewUrl ?? null);
      event.target.value = "";
      return;
    }

    setLocalError(null);
    updateFile(selectedFile);
    event.target.value = "";
  };

  const handleClear = () => {
    if (disabled) return;
    setLocalError(null);
    setIsPreviewLoading(false);
    revokeObjectUrl();
    setPreviewUrl(defaultPreviewUrl ?? null);
    updateFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const displayError = localError ?? errorMessage ?? null;
  const hasError = Boolean(localError) || Boolean(isInvalid);
  const describedBy = displayError ? errorId : undefined;

  const renderPreview = () => {
    if (!previewUrl) {
      return (
        <div className="flex h-40 w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/5 text-sm text-muted-foreground">
          No se ha cargado ninguna imagen
        </div>
      );
    }

    return (
      <div className="relative h-48 w-full overflow-hidden rounded-md border border-dashed border-muted-foreground/40 bg-muted/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={file?.name ?? label ?? "Selected media preview"}
          className={cn(
            "h-full w-full object-contain transition-opacity",
            isPreviewLoading ? "opacity-0" : "opacity-100",
          )}
          onLoad={() => setIsPreviewLoading(false)}
          onError={() => {
            setLocalError(DEFAULT_ERROR_MESSAGE);
            setIsPreviewLoading(false);
            revokeObjectUrl();
            setPreviewUrl(null);
          }}
        />
        {isPreviewLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="md" aria-label="Loading image preview" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {isRequired ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-required={isRequired}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        onChange={handleInputChange}
      />
      <div className="flex flex-wrap items-center gap-2">
        <ButtonDos
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          {file ? "Cambiar imagen" : "Seleccionar imagen"}
        </ButtonDos>
        {(file || previewUrl) && (
          <ButtonDos
            type="button"
            intent="outlineRed"
            onClick={handleClear}
            disabled={disabled}
          >
            Limpiar
          </ButtonDos>
        )}
        {file ? (
          <span className="max-w-[240px] truncate text-sm text-muted-foreground">
            {file.name}
          </span>
        ) : null}
      </div>
      {renderPreview()}
      {displayError ? (
        <p id={errorId} className="text-sm text-destructive">
          {displayError}
        </p>
      ) : null}
    </div>
  );
}
