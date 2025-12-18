/* eslint-disable no-unused-vars */
"use client";

import { selectInputStyles } from "@/utils";
import {
  Input,
  Select,
  SelectItem,
  Slider,
  Switch,
  type Selection,
} from "@heroui/react";
import { Hash, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { type TimePreset } from "./hooks/use-filters";
import { PostulationStatus } from "@/types";

export interface Option<T = string> {
  key: T;
  label: string;
}

export const STATUS_OPTIONS: Option<PostulationStatus>[] = [
  { key: "unreviewed", label: "Sin revisión" },
  { key: "hired", label: "Contratado" },
  { key: "discarded", label: "Descartado" },
];

interface FiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;

  campNoValue: string;
  onCampNoChange: (value: string) => void;
  onCampNoClear: () => void;

  minAge: number;
  maxAge: number;
  onAgeRangeChange: (range: [number, number]) => void;

  genderOptions: Option[];
  selectedGenders: Selection;
  onGendersChange: (keys: Selection) => void;

  sectorOptions: Option[];
  selectedSectors: Selection;
  onSectorsChange: (keys: Selection) => void;

  favoritesOnly: boolean;
  onFavoritesChange: (value: boolean) => void;

  timePreset: TimePreset;
  onTimePresetChange: (preset: TimePreset) => void;

  selectedStatuses: Selection;
  onStatusesChange: (status: Selection) => void;
}

export default function Filters(props: FiltersProps) {
  const {
    searchValue,
    onSearchChange,
    onSearchClear,
    campNoValue,
    onCampNoChange,
    onCampNoClear,
    minAge,
    maxAge,
    onAgeRangeChange,
    genderOptions,
    selectedGenders,
    onGendersChange,
    sectorOptions,
    selectedSectors,
    onSectorsChange,
    favoritesOnly,
    onFavoritesChange,
    selectedStatuses,
    onStatusesChange,
    timePreset,
    onTimePresetChange,
  } = props;

  const [localAgeRange, setLocalAgeRange] = useState<[number, number]>([
    minAge,
    maxAge,
  ]);

  useEffect(() => {
    setLocalAgeRange([minAge, maxAge]);
  }, [minAge, maxAge]);

  // const isEraseDisabled =
  //   selectedRows !== "all" && (selectedRows as Set<unknown>).size === 0;

  return (
    <div className="py-auto flex h-20 w-full items-center justify-between gap-8 overflow-x-auto border-b border-b-foreground-300 bg-white px-3">
      <div className="flex min-w-[700px] flex-1 items-center gap-6">
        {/* Buscar por nombre */}
        <Input
          isClearable
          className="w-full min-w-[175px]"
          placeholder="Buscar por nombre..."
          startContent={<SearchIcon size={16} />}
          value={searchValue}
          onClear={onSearchClear}
          onValueChange={onSearchChange}
          size="sm"
        />

        {/* Campaña */}
        <Input
          isClearable
          type="number"
          className="w-2/4 min-w-[140px]"
          placeholder="Campaña"
          startContent={<Hash size={14} />}
          value={campNoValue}
          onClear={onCampNoClear}
          onValueChange={onCampNoChange}
          size="sm"
        />

        {/* Rango de edad */}
        <Slider
          className="min-w-[200px] max-w-md"
          label="Edad"
          aria-label="Filtrar por rango de edad"
          maxValue={70}
          minValue={18}
          step={1}
          size="sm"
          value={localAgeRange}
          onChange={(value) => {
            const [from, to] = Array.isArray(value) ? value : [value, value];
            setLocalAgeRange([from, to]); // solo UI, sin fetch
          }}
          // 👇 se dispara al soltar el slider
          onChangeEnd={(value) => {
            const [from, to] = Array.isArray(value) ? value : [value, value];
            onAgeRangeChange([from, to]); // acá recién tocamos filtros “reales”
          }}
        />

        {/* Género (multi) */}
        <Select
          {...selectInputStyles}
          className="min-w-[175px]"
          labelPlacement="inside"
          size="sm"
          label="Género"
          placeholder="Seleccionar"
          selectionMode="multiple"
          selectedKeys={selectedGenders}
          onSelectionChange={onGendersChange}
        >
          {genderOptions.map((item) => (
            <SelectItem key={item.key}>{item.label}</SelectItem>
          ))}
        </Select>

        {/* Sector (multi) */}
        <Select
          {...selectInputStyles}
          className="min-w-[175px]"
          size="sm"
          labelPlacement="inside"
          label="Sector de Postulación"
          placeholder="Seleccionar"
          selectionMode="multiple"
          selectedKeys={selectedSectors}
          onSelectionChange={onSectorsChange}
        >
          {sectorOptions.map((item) => (
            <SelectItem key={item.key}>{item.label}</SelectItem>
          ))}
        </Select>

        {/* Fecha de la postulación */}
        <Select
          {...selectInputStyles}
          className="min-w-[160px]"
          size="sm"
          labelPlacement="inside"
          label="Fecha de postulación"
          selectedKeys={new Set([timePreset])}
          onSelectionChange={(keys) => {
            const [first] = Array.from(keys);
            onTimePresetChange((first as TimePreset) ?? "6m");
          }}
          isDisabled={favoritesOnly}
        >
          <SelectItem key="3m">Últimos 3 meses</SelectItem>
          <SelectItem key="6m">Últimos 6 meses</SelectItem>
          <SelectItem key="12m">Últimos 12 meses</SelectItem>
          <SelectItem key="all">Todo el historial</SelectItem>
        </Select>

        {/* Estado de postulación */}
        <Select
          {...selectInputStyles}
          className="min-w-[150px]"
          size="sm"
          labelPlacement="inside"
          label="Estado"
          placeholder="Seleccionar"
          selectionMode="multiple"
          selectedKeys={selectedStatuses}
          onSelectionChange={onStatusesChange}
          isDisabled={favoritesOnly}
        >
          {STATUS_OPTIONS.map((item) => (
            <SelectItem key={item.key}>{item.label}</SelectItem>
          ))}
        </Select>
      </div>

      {/* Solo favoritas */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm">Ver solo favoritas</span>
        <Switch
          size="sm"
          isSelected={favoritesOnly}
          onValueChange={onFavoritesChange}
          className="min-w-[130px] justify-center"
        />
      </div>
    </div>
  );
}
