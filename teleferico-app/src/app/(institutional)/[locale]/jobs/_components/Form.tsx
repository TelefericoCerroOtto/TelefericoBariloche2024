"use client";

import { sectorOptions } from "@/app/(administration)/dashboard/(sections)/recruitment/_components/data";
import { ButtonDos, Input } from "@/components";
import { useTranslation } from "@/hooks";
import { selectInputStyles } from "@/utils/styles";
import { Select, SelectItem } from "@nextui-org/react";
// import { Input as InputNextui } from "@nextui-org/react";

export default function Form() {
  const { t } = useTranslation();
  const formIntl = t("components.Forms");

  return (
    <form className="grid flex-grow grid-cols-1 gap-4 lg:grid-cols-2">
      <Input
        id="firstName"
        name="firstName"
        label={formIntl.fields.firstName.label}
        placeholder={formIntl.fields.firstName.placeholder}
      />
      <Input
        id="lastName"
        name="lastName"
        label={formIntl.fields.lastName.label}
        placeholder={formIntl.fields.lastName.placeholder}
      />
      <Select
        {...selectInputStyles}
        name="genre"
        id="genre"
        label={formIntl.fields.genre.label}
        placeholder={formIntl.fields.genre.placeholder}
      >
        <SelectItem key="male">{formIntl.fields.genre.items.male}</SelectItem>
        <SelectItem key="female">
          {formIntl.fields.genre.items.female}
        </SelectItem>
        <SelectItem key="other">{formIntl.fields.genre.items.other}</SelectItem>
      </Select>
      {/* <InputNextui
        id="age"
        name="age"
        label="Edad"
        placeholder="Edad"
        type="number"
        labelPlacement="outside"
        className="rounded-full border"
        onValueChange={(e) => {
          let value = parseInt(e);
          if (value < 0) {
            value = 0;
          }
          setFieldValue("campNo", value);
        }}
      /> */}
      <Input
        id="age"
        name="age"
        label={formIntl.fields.age.label}
        placeholder={formIntl.fields.age.placeholder}
        type="number"
      />
      <Input
        id="email"
        name="email"
        label={formIntl.fields.email.label}
        placeholder={formIntl.fields.email.placeholder}
        type="email"
      />
      <Select
        {...selectInputStyles}
        labelPlacement="outside"
        name="sector"
        id="sector"
        label={formIntl.fields.sector.label}
        placeholder={formIntl.fields.sector.placeholder}
        items={sectorOptions}
        // value={values.sector}
        // onChange={(evt) => setFieldValue("sector", evt.target.value)}
      >
        {(item) => (
          <SelectItem key={item.key}>
            {formIntl.fields.sector.items[item.key]}
          </SelectItem>
        )}
      </Select>
      <Input
        id="campNo"
        name="campNo"
        label={formIntl.fields.campNo.label}
        placeholder={formIntl.fields.campNo.placeholder}
        type="number"
      />
      <Input
        id="cv"
        name="cv"
        label={formIntl.fields.cv.label}
        placeholder={formIntl.fields.cv.placeholder}
        type="file"
      />
      <ButtonDos type="submit" className="w-[90px]">
        {formIntl.sendbtn}
      </ButtonDos>
    </form>
  );
}
