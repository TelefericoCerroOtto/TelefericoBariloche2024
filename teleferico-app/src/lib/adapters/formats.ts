import type { TimeValue } from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import { type JSONContent } from "@tiptap/react";

export const TimeValueToStrapiTime = (time: TimeValue): string => {
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${pad(time.hour)}:${pad(time.mins)}:00`;
};

/**
 * Convierte un string en formato hh:mm:ss a hh:mm
 * @throws Error si el formato no es válido
 */
export function StrapiTimeToTableRecordTime(time: string): string {
  const regex = /^(\d{2}):(\d{2}):(\d{2})$/;
  const match = regex.exec(time);

  if (!match) {
    throw new Error(`Invalid time format (expected hh:mm:ss): ${time}`);
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const [_, hh, mm, ss] = match;

  validateTime(Number(hh), Number(mm), Number(ss));

  return `${hh}:${mm}`;
}

/**
 * Convierte un string en formato hh:mm a hh:mm:ss
 * @throws Error si el formato no es válido
 */
export function TableRecordTimeToStrapiTime(time: string): string {
  const regex = /^(\d{2}):(\d{2})$/;
  const match = regex.exec(time);

  if (!match) {
    throw new Error(`Invalid time format (expected hh:mm): ${time}`);
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const [_, hh, mm] = match;

  validateTime(Number(hh), Number(mm));

  return `${hh}:${mm}:00`;
}

/**
 * Valida rangos de hora, minuto y segundo
 */
function validateTime(hh: number, mm: number, ss: number = 0): void {
  if (hh < 0 || hh > 23) {
    throw new Error(`Invalid hour value: ${hh}`);
  }
  if (mm < 0 || mm > 59) {
    throw new Error(`Invalid minutes value: ${mm}`);
  }
  if (ss < 0 || ss > 59) {
    throw new Error(`Invalid seconds value: ${ss}`);
  }
}

export function formatBytesToMB(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

export function StrapiBlocksContentToTiptapJSONContent = (content: BlocksContent): JSONContent => {}