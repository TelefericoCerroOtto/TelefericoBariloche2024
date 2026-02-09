import type { GetServiceStateResponse, Zone } from "@/types";

export type ZoneStatus = "open" | "closed";

function createDateFromStrapiTime(time: string | undefined) {
  if (!time) {
    return null;
  }

  const [hoursStr, minutesStr, secondsStr] = time.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  const seconds = Number(secondsStr ?? "0");

  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return null;
  }

  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

export function getZoneStatus(
  zone: Pick<Zone, "openTime" | "closeTime" | "isOpen">,
  reference: Date,
  serviceState: GetServiceStateResponse["data"]["state"],
): ZoneStatus {
  const openDate = createDateFromStrapiTime(zone.openTime);
  const closeDate = createDateFromStrapiTime(zone.closeTime);

  if (serviceState === "closed" || serviceState === "suspended") {
    return "closed";
  }

  if (!openDate || !closeDate) {
    return zone.isOpen ? "open" : "closed";
  }

  const nowTime = reference.getTime();
  const closeTime = closeDate.getTime();
  const openTime = openDate.getTime();

  if (nowTime >= closeTime && nowTime < openTime) {
    return "closed";
  }

  if (nowTime >= openTime && nowTime < closeTime) {
    return zone.isOpen ? "open" : "closed";
  }

  return "closed";
}
