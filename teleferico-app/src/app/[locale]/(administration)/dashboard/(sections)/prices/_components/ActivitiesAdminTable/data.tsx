import type { ReactNode } from "react";

const DIFF_EXPLANATION_MESSAGE: ReactNode = (
  <>
    <div className="mt-4 rounded-xl border border-default-200 bg-default-50 p-4">
      <p className="text-sm font-semibold text-default-900">
        Diferencia con “Disponible”
      </p>
      <p className="mt-1 text-sm text-default-600">
        <strong>Disponible</strong> indica si la actividad está operativa en
        este momento (por ejemplo, por temporada). Aunque no esté disponible,
        puede seguir visible y accesible para el público como información.
      </p>
    </div>
  </>
);

export const DISABLED_STATE_MESSAGE: ReactNode = (
  <>
    <p className="mt-2 text-default-900">
      <strong>Ocultar</strong> la quita completamente del sitio público: no
      aparecerá en listados ni se podrá acceder desde ninguna sección. Si esta
      actividad tiene una página propia, también dejará de estar accesible.
    </p>

    <p className="mt-3 text-default-900">
      La actividad seguirá existiendo y{" "}
      <strong>solo será visible para administradores</strong> desde el panel.
    </p>

    <p className="mt-3 text-default-900">
      Podés revertir esta acción en cualquier momento publicándola nuevamente.
    </p>

    {DIFF_EXPLANATION_MESSAGE}
  </>
);

export const ENABLED_STATE_MESSAGE: ReactNode = (
  <>
    <p className="mt-2 text-default-900">
      <strong>Publicar</strong> esta actividad la volverá accesible al público
      dentro del sitio: aparecerá nuevamente en listados y secciones donde
      corresponda. Si esta actividad tiene una página propia, también volverá a
      estar accesible.
    </p>

    <p className="mt-2 text-default-900">
      Antes de publicarla, asegurate de que la información esté actualizada.
      Podés ocultarla nuevamente en cualquier momento.
    </p>

    {DIFF_EXPLANATION_MESSAGE}
  </>
);
