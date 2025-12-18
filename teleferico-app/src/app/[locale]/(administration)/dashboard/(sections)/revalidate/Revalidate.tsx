"use client";

import { ButtonDos, FormContainer } from "@/components";
import { CACHE_TAGS } from "@/lib/constants/cache-tags.const";
import { Select, SelectItem, type Selection } from "@heroui/react";
import { useState } from "react";
import { revalidate } from "./actions";

export default function Revalidate() {
  const [value, setValue] = useState<Selection>(new Set([]));

  return (
    <FormContainer desc="Este formulario sirve para revalidar de manera manual el contenido obtenido por las funciones asincronas asociadas a la etiequeta seleccionada">
      <form className="flex flex-col gap-6" action={revalidate}>
        <Select
          items={Object.values(CACHE_TAGS).map((tag) => ({ tag }))}
          variant="bordered"
          name="tag"
          id="tag"
          selectedKeys={value}
          onSelectionChange={setValue}
          disallowEmptySelection
        >
          {(item) => <SelectItem key={item.tag}>{item.tag}</SelectItem>}
        </Select>
        <ButtonDos type="submit">Revalidar</ButtonDos>
      </form>
    </FormContainer>
  );
}
