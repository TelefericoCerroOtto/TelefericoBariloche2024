"use client";

import { i18n } from "@/i18n";
import type { Genders, GetPostulationsResponse } from "@/types";
import { Chip, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { CheckCircle2, Clock, OctagonAlert, XCircle } from "lucide-react";
import ActionsButton from "./ActionsButton";
import { type ColumnKeys } from "./data";
import { type Option } from "./Filters";
import { truncateString } from "@/utils/truncate-string";

type PostulationItem = GetPostulationsResponse["data"][number];

interface RenderCellParams {
  item: PostulationItem;
  columnKey: ColumnKeys;
  genderOptions: Option<Genders>[];
  userId: number;
  handleFavoriteSync: (
    // eslint-disable-next-line no-unused-vars
    postulationId?: string,
    // eslint-disable-next-line no-unused-vars
    nextFavorite?: boolean,
  ) => Promise<void>;
}

export function renderPostulationCell({
  item,
  columnKey,
  genderOptions,
  userId,
  handleFavoriteSync,
}: RenderCellParams) {
  const completeName = `${item.name} ${item.surname}`;

  switch (columnKey) {
    case "date":
      return (
        <span>
          {new Date(item.createdAt).toLocaleDateString(i18n.defaultLocale, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
      );

    case "name":
      return <span>{completeName}</span>;

    case "email":
      return <span>{item.email}</span>;

    case "age":
      return <span>{item.age}</span>;

    case "gender":
      return (
        <span>{genderOptions.find((g) => g.key === item.gender)?.label}</span>
      );

    case "sector":
      return (
        <span>{item.sector?.sector_names?.[0]?.name ?? "Sin sector"}</span>
      );

    case "campNo":
      return item.campNo ? <span>{item.campNo}</span> : <span>-</span>;

    case "postulation_status": {
      const status = item.postulation_status;

      let label: string;
      let color: "default" | "success" | "danger" | "warning";
      let className: string;
      let Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;

      switch (status) {
        case "unreviewed":
          label = "Sin revisión";
          color = "default";
          className =
            "!border-default-300 !bg-default-100 !text-default-800 " +
            "dark:!border-default-700/70 dark:!bg-default-900/30 dark:!text-default-200";
          Icon = Clock;
          break;

        case "hired":
          label = "Contratado";
          color = "success";
          className =
            "!border-success-300 !bg-success-100 !text-success-800 " +
            "dark:!border-success-700/70 dark:!bg-success-900/30 dark:!text-success-200";
          Icon = CheckCircle2;
          break;

        case "discarded":
          label = "Descartado";
          color = "danger";
          className =
            "!border-danger-300 !bg-danger-100 !text-danger-800 " +
            "dark:!border-danger-700/70 dark:!bg-danger-900/30 dark:!text-danger-200";
          Icon = XCircle;
          break;

        default:
          label = "Sin estado";
          color = "warning";
          className =
            "!border-warning-300 !bg-warning-100 !text-warning-900 " +
            "dark:!border-warning-700/70 dark:!bg-warning-900/30 dark:!text-warning-200";
          Icon = OctagonAlert;
      }

      return (
        <Chip
          size="sm"
          variant="faded"
          color={color}
          className={`font-medium ${className}`}
          startContent={
            <Icon className="h-3.5 w-3.5 text-current" aria-hidden="true" />
          }
          aria-label={`Estado de la postulación: ${label}`}
        >
          {label}
        </Chip>
      );
    }

    case "note": {
      if (!item.note) return <span>-</span>;

      const MAX_CHARS = 80;
      const preview = truncateString(item.note, MAX_CHARS);

      return (
        <Popover placement="top-start" showArrow>
          <PopoverTrigger>
            <button
              type="button"
              className="max-w-[260px] truncate text-left text-base text-default-700 hover:underline"
              aria-label="Ver nota completa"
              title="Ver nota completa"
            >
              {preview}
            </button>
          </PopoverTrigger>
          <PopoverContent className="max-w-md whitespace-pre-wrap text-base">
            {item.note}
          </PopoverContent>
        </Popover>
      );
    }

    case "actions": {
      const isFavForUser =
        item.faved_by?.some((u) => String(u.id) === String(userId)) ?? false;

      const hasCv = Boolean(item.cvUploadedAt);

      return (
        <div className="flex items-center justify-center">
          <ActionsButton
            id={item.documentId}
            name={completeName}
            hasCv={hasCv}
            isFavorite={isFavForUser}
            onToggle={() => {
              // el propio ActionsButton se encarga del fetch
              // y acá solo sincronizamos la tabla vía SWR
              void handleFavoriteSync();
            }}
          />
        </div>
      );
    }

    default:
      return null;
  }
}
