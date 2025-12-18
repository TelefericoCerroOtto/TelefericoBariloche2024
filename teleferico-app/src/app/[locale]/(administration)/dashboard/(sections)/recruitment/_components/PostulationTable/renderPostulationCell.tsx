"use client";

import { i18n } from "@/i18n";
import type { Genders, GetPostulationsResponse } from "@/types";
import { Chip, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { CheckCircle2, Clock, OctagonAlert, XCircle } from "lucide-react";
import ActionsButton from "./ActionsButton";
import { type ColumnKeys } from "./data";
import { type Option } from "./Filters";

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
      let Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;

      switch (status) {
        case "unreviewed":
          label = "Sin revisión";
          color = "default";
          Icon = Clock;
          break;
        case "hired":
          label = "Contratado";
          color = "success";
          Icon = CheckCircle2;
          break;
        case "discarded":
          label = "Descartado";
          color = "danger";
          Icon = XCircle;
          break;
        default:
          label = "Sin estado";
          color = "warning";
          Icon = OctagonAlert;
      }

      return (
        <Chip
          size="sm"
          variant="faded"
          color={color}
          className="font-medium"
          startContent={<Icon className="h-3.5 w-3.5" aria-hidden="true" />}
          aria-label={`Estado de la postulación: ${label}`}
        >
          {label}
        </Chip>
      );
    }

    case "note": {
      if (!item.note) return <span>-</span>;

      const MAX_CHARS = 80;
      const preview =
        item.note.length > MAX_CHARS
          ? item.note.slice(0, MAX_CHARS) + "…"
          : item.note;

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

      const resumePath = item.resume?.url ?? null;

      return (
        <div className="flex items-center justify-center">
          <ActionsButton
            id={item.documentId}
            name={completeName}
            resumePath={resumePath}
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
