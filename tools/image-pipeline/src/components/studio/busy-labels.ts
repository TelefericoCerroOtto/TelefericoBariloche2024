export const PREVIEW_REFRESH_BUSY_LABEL = "Actualizando vista previa...";
export const FOCAL_POINT_BUSY_LABEL = "Actualizando punto focal...";

const HIDDEN_NON_CANONICAL_BUSY_LABELS = new Set([
  PREVIEW_REFRESH_BUSY_LABEL,
  FOCAL_POINT_BUSY_LABEL,
]);

export function getNonCanonicalBusyLabel(busyLabel?: string) {
  return busyLabel && HIDDEN_NON_CANONICAL_BUSY_LABELS.has(busyLabel) ? undefined : busyLabel;
}
