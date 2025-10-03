"use client";

import { TimeInputProps } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import dynamic from "next/dynamic";

// ⚠️ IMPORTANTE: Este TimeInput se importa dinámicamente con `ssr: false`
// porque HeroUI/React Aria no es SSR-safe. Si se renderiza en el servidor,
// produce un "Hydration failed" error debido a diferencias de espacios y
// renderizado de segmentos entre server y client.
//
// Para mejorar la UX mientras carga en el cliente, usamos un fallback
// Skeleton en `loading`. No eliminar esto sin verificar la compatibilidad
// SSR del componente.
const TimeInput = dynamic<TimeInputProps>(
  () => import("@heroui/react").then((m) => m.TimeInput),
  {
    ssr: false,
    loading: () => <Skeleton className="h-10 w-full rounded-md" />,
  },
);

export default TimeInput;
