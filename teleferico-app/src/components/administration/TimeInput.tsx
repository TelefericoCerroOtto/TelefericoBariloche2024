"use client";

import { TimeFormData } from "@/types/forms";
import { Select, SelectItem, SharedSelection } from "@nextui-org/react";

interface Props {
  title: string;
  defaultHour: TimeFormData;
  defaultMin: TimeFormData;
  // eslint-disable-next-line no-unused-vars
  onHourChange: (e: SharedSelection) => void;
  // eslint-disable-next-line no-unused-vars
  onMinChange: (e: SharedSelection) => void;
}

const hours = Array.from({ length: 24 }, (_, index) => {
  const idxStr = index.toString();
  return {
    key: idxStr,
    label: index < 10 ? "0" + idxStr : idxStr,
  };
});

const mins = Array.from({ length: 60 }, (_, index) => {
  const idxStr = index.toString();
  return {
    key: idxStr,
    label: index < 10 ? "0" + idxStr : idxStr,
  };
});

export default function TimeInput(props: Props) {
  const { title, defaultHour, defaultMin, onHourChange, onMinChange } = props;

  return (
    <div className="w-full">
      <p className="text-center sm:text-start">{title}</p>
      <fieldset className="flex flex-col gap-5 sm:flex-row">
        <div className="flex items-center justify-center gap-3">
          <p className="text-sm font-light">Hora:</p>
          <Select
            name="openHour"
            id="openHour"
            variant="bordered"
            className="w-[120px]"
            size="sm"
            scrollShadowProps={{
              isEnabled: false,
            }}
            items={hours}
            defaultSelectedKeys={[defaultHour.hour.toString()]}
            onSelectionChange={onHourChange}
          >
            {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
          </Select>
        </div>
        <div className="flex items-center justify-center gap-3">
          <p className="text-sm font-light">Minutos:</p>
          <Select
            name="openMins"
            id="openMins"
            variant="bordered"
            className="w-[120px]"
            size="sm"
            scrollShadowProps={{
              isEnabled: false,
            }}
            items={mins}
            defaultSelectedKeys={defaultMin.mins.toString()}
            onSelectionChange={onMinChange}
          >
            {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
          </Select>
        </div>
      </fieldset>
    </div>
  );
}
