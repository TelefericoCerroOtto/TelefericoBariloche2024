import { ActivityShowcase } from "@/components/institutional";
import type { RendererMap } from "../shared/types";

export const renderActivityShowcase: RendererMap["page-components.activity-showcase"] =
  (block, ctx) => {
    const documentId = block.activity?.documentId;

    if (!documentId) {
      // Mantener el sitio robusto ante contenido mal configurado
      return (
        <div className="my-10 rounded-2xl border border-danger/30 bg-danger/5 p-5">
          <p className="text-sm font-medium text-danger">
            No se configuró una actividad para este bloque.
          </p>
        </div>
      );
    }

    return <ActivityShowcase documentId={documentId} locale={ctx.locale} />;
  };
