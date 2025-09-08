/* eslint-disable no-unused-vars */
"use client";

import { ButtonDos } from "@/components";
import { selectInputStyles } from "@/utils";
import { Input, Select, Selection, SelectItem, Slider } from "@heroui/react";
import { FormikErrors } from "formik";
import { Hash, SearchIcon } from "lucide-react";
import { type FormData } from "./PostulationsTable";
import { type Option } from "./data";

interface Props {
  isFiltering?: boolean;
  genreOptions?: Option[];
  sectorOptions: Option[];
  values: FormData;
  selectedRows: Selection;
  setFieldValue: (
    field: keyof FormData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    shouldValidate?: boolean,
  ) => Promise<void> | Promise<FormikErrors<FormData>>;
}

export default function Filters(props: Props) {
  const {
    isFiltering,
    genreOptions,
    sectorOptions,
    selectedRows,
    setFieldValue,
    values,
  } = props;

  const onClick = () => {
    console.log("click");
  };

  const isDisabled = selectedRows !== "all" && selectedRows.size === 0;

  return (
    <div className="py-auto flex h-20 w-full items-center justify-between gap-8 overflow-scroll border-b border-b-foreground-300 bg-white px-3">
      <div className="flex min-w-[600px] flex-1 items-center gap-6">
        <Input
          isClearable
          className="w-full min-w-[175px]"
          placeholder="Buscar por nombre..."
          startContent={<SearchIcon />}
          value={values.name}
          onClear={() => setFieldValue("name", "")}
          onValueChange={(e) => setFieldValue("name", e)}
        />
        <Input
          isClearable
          type="number"
          className="w-2/4 min-w-[175px]"
          placeholder="Campaña"
          startContent={<Hash />}
          value={values.campNo.toString()}
          onValueChange={(e) => {
            let value = parseInt(e);
            if (value < 0) {
              value = 0;
            }
            setFieldValue("campNo", value);
          }}
        />
        <Slider
          className="min-w-[200px] max-w-md"
          defaultValue={[values.minAge, values.maxAge]}
          label="Edad"
          maxValue={70}
          minValue={18}
          step={1}
          size="sm"
          onChange={(ageRange) => {
            const range = ageRange as number[];
            setFieldValue("minAge", range[0]);
            setFieldValue("maxAge", range[1]);
          }}
        />
        <Select
          {...selectInputStyles}
          className="min-w-[175px]"
          labelPlacement="inside"
          size="sm"
          name="genre"
          id="genre"
          label="Género"
          placeholder="Seleccionar"
          items={genreOptions}
          selectionMode="multiple"
          value={values.genre}
          onChange={(evt) => setFieldValue("genre", evt.target.value)}
        >
          {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
        </Select>
        <Select
          {...selectInputStyles}
          className="min-w-[175px]"
          size="sm"
          labelPlacement="inside"
          name="sector"
          id="sector"
          label="Sector de Postulación"
          placeholder="Seleccionar"
          items={sectorOptions}
          selectionMode="multiple"
          value={values.sector}
          onChange={(evt) => setFieldValue("sector", evt.target.value)}
        >
          {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
        </Select>
        <ButtonDos type="submit" intent="ghostBlack" disabled={isFiltering}>
          Filtrar
        </ButtonDos>
      </div>
      <ButtonDos
        onClick={onClick}
        intent={isDisabled ? "disable" : "solid"}
        disabled={isDisabled}
        type="button"
      >
        Eliminar
      </ButtonDos>
    </div>
  );
}
