"use client";

import { CustomLink } from "@/components";
import type { Zone } from "@/types";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import { Pencil } from "lucide-react";

interface Props {
  zone: Zone;
}

export default function ActionsButtons(props: Props) {
  const { zone } = props;

  return (
    <div className="relative flex flex-row justify-center gap-2">
      <CustomLink
        size="sm"
        href={`${ADMIN_ROUTES.ZONES}/${zone.documentId}`}
        withButtonStyles
        intent="ghostBlack"
      >
        <Pencil size={20} />
        Editar
      </CustomLink>
    </div>
  );
}
