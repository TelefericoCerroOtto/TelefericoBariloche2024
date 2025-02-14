"use client";

import { ButtonDos, Input } from "@/components";
import { useTranslation } from "@/hooks";
import { Textarea } from "@nextui-org/react";

export default function Form() {
  const { t } = useTranslation();
  const formIntl = t("components.Forms");

  return (
    <form className="grid flex-grow grid-cols-1 gap-4">
      <Input id="name" name="name" label="Nombre" placeholder="Nombre" />
      <Input
        id="email"
        name="email"
        label={formIntl.fields["email"].label}
        placeholder={formIntl.fields["email"].placeholder}
        type="email"
      />
      <Textarea
        id="consultation"
        name="consultation"
        label={formIntl.fields["consultation"].label}
        placeholder={formIntl.fields["consultation"].placeholder}
        labelPlacement="outside"
      />
      <ButtonDos type="submit" className="w-[90px]">
        {formIntl.sendbtn}
      </ButtonDos>
    </form>
  );
}
