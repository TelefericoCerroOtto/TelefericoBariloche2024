"use client";

import { ButtonDos, FormContainer } from "@/components";
import { CACHE_TAGS } from "@/utils/cache-tags.const";
import { Select, SelectItem } from "@nextui-org/react";
import { revalidate } from "./actions";

export default function Revalidate() {
  return (
    <FormContainer desc="Este formulario sirve para revalidar de manera manual el contenido obtenido por las funciones asincronas asociadas a la etiequeta seleccionada">
      <form className="flex flex-col gap-6" action={revalidate}>
        <Select
          items={Object.values(CACHE_TAGS).map((tag) => ({ tag }))}
          variant="bordered"
          name="tag"
          id="tag"
          disallowEmptySelection
        >
          {(item) => (
            <SelectItem key={item.tag} value={item.tag}>
              {item.tag}
            </SelectItem>
          )}
        </Select>
        <ButtonDos type="submit">Revalidar</ButtonDos>
      </form>
    </FormContainer>
  );
}
