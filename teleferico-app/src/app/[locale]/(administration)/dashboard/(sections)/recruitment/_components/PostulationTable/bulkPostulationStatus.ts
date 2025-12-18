import { authenticatedInternalApiFetch } from "@/lib/http/clients/auth-internal-fetch";
import type {
  GetPostulationsResponse,
  PostulationBulkStatusApiResponse,
  PostulationsBulkStatusRequestPayload,
  PostulationStatus,
} from "@/types";
import { ROUTE_HANDLERS } from "@/utils";
import type { Selection } from "@heroui/react";

type PostulationItem = GetPostulationsResponse["data"][number];

export interface HandleBulkStatusDeps {
  postulationStatus: PostulationStatus;
  postulations: PostulationItem[];
  selectedRows: Selection;
  key?: string;
  // Podés ajustar el tipo de mutate según tu setup de SWR
  // eslint-disable-next-line no-unused-vars
  mutate: (key?: string) => Promise<unknown> | void;
  // eslint-disable-next-line no-unused-vars
  setIsBulkApplying: (value: boolean) => void;
  // eslint-disable-next-line no-unused-vars
  setSelectedRows: (value: Selection) => void;
  // eslint-disable-next-line no-unused-vars
  showAlert: (params: {
    title: string;
    message: string;
    variant: "success" | "danger";
  }) => void;
}

/**
 * Aplica un estado en batch a las postulaciones seleccionadas.
 * No usa hooks: sólo recibe dependencias y efectos por parámetro.
 */
export async function handleBulkPostulationStatus({
  postulationStatus,
  postulations,
  selectedRows,
  key,
  mutate,
  setIsBulkApplying,
  setSelectedRows,
  showAlert,
}: HandleBulkStatusDeps) {
  if (!postulations.length) return;

  const documentIds =
    selectedRows === "all"
      ? postulations.map((p) => p.documentId)
      : postulations
          .filter((p) => (selectedRows as Set<unknown>).has(p.documentId))
          .map((p) => p.documentId);

  if (!documentIds.length) return;

  try {
    setIsBulkApplying(true);

    const reqBody: PostulationsBulkStatusRequestPayload = {
      documentIds,
      postulationStatus,
    };

    const res = await authenticatedInternalApiFetch(
      ROUTE_HANDLERS.POSTULATIONS_BULK_STATUS,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      },
    );

    if (!res.ok) {
      console.log("bulk status error", res);
      showAlert({
        title: "Error",
        message:
          "Ocurrió un error al actualizar el estado de las postulaciones.",
        variant: "danger",
      });
      return;
    }

    const data = (await res.json()) as PostulationBulkStatusApiResponse;

    if (!data.ok) {
      console.log("bulk status error", data.message, "\n", data.data);
      showAlert({
        title: "Error",
        message:
          "Ocurrió un error al actualizar el estado de las postulaciones.",
        variant: "danger",
      });
      return;
    }

    showAlert({
      title: "Estados actualizados",
      message:
        data.message ??
        "Las postulaciones seleccionadas se actualizaron correctamente.",
      variant: "success",
    });

    if (key) {
      await mutate(key);
    }

    // Limpiar selección
    setSelectedRows(new Set([]));
  } catch (error) {
    console.error("bulk status error", error);
    showAlert({
      title: "Error",
      message: "Ocurrió un error al actualizar el estado de las postulaciones.",
      variant: "danger",
    });
  } finally {
    setIsBulkApplying(false);
  }
}
