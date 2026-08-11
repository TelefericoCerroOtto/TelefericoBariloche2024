import type { ServiceStateValues } from "@/types";

export type MaintenanceLocale = "es-AR" | "en" | "pt";

type StateCopy = {
  title: string;
  stateDesc: string;
  stateLegend: string;
};

type ServiceStatusCopy = {
  loading: string;
  lastUpdated: string;
  states: Record<ServiceStateValues, StateCopy>;
};

const SERVICE_STATES: readonly ServiceStateValues[] = [
  "normal",
  "conditional",
  "restricted",
  "suspended",
  "closed",
];

const SERVICE_STATUS_COPY: Record<MaintenanceLocale, ServiceStatusCopy> = {
  "es-AR": {
    loading: "Consultando el estado actual del servicio",
    lastUpdated: "Última actualización",
    states: {
      normal: {
        title: "Servicio Normal:",
        stateDesc: "Ascenso permitido a todos los pasajeros sin restricciones.",
        stateLegend: "El medio de elevación opera normalmente.",
      },
      conditional: {
        title: "Servicio Condicional:",
        stateDesc: "Podrían presentarse demoras por factores climáticos.",
        stateLegend: "El medio de elevación opera de manera condicional.",
      },
      restricted: {
        title: "Servicio Condicional con Restricciones:",
        stateDesc:
          "Es muy probable que haya demoras o una eventual suspensión del medio. Por esta razón, el ascenso está limitado para grupos como mujeres embarazadas, personas con movilidad reducida, adultos mayores, etc. Si vas a subir, es preferible que no tengas ningún otro compromiso.",
        stateLegend:
          "El medio de elevación se encuentra en servicio condicional con restricciones.",
      },
      suspended: {
        title: "Servicio Suspendido:",
        stateDesc:
          "El ascenso por góndola está detenido; es decir, no se puede subir.",
        stateLegend: "El medio de elevación se encuentra suspendido.",
      },
      closed: {
        title: "",
        stateDesc: "",
        stateLegend:
          "Actualmente estamos cerrados. ¡Esperamos tu próxima visita!",
      },
    },
  },
  en: {
    loading: "Checking the current service status",
    lastUpdated: "Last updated",
    states: {
      normal: {
        title: "Normal Service:",
        stateDesc:
          "Ascent is permitted for all passengers without restrictions.",
        stateLegend: "The lift is operating normally.",
      },
      conditional: {
        title: "Conditional Service:",
        stateDesc: "Delays may occur due to weather conditions.",
        stateLegend: "The lift is operating conditionally.",
      },
      restricted: {
        title: "Conditional Service with Restrictions:",
        stateDesc:
          "Delays or a temporary suspension of the lift are very likely. For this reason, ascent is restricted for groups such as pregnant women, people with reduced mobility, older adults, etc. If you are going up, it is preferable that you have no other commitments.",
        stateLegend:
          "The lift is operating under conditional service with restrictions.",
      },
      suspended: {
        title: "Suspended Service:",
        stateDesc:
          "Travel by gondola is stopped; that is, ascent is not possible.",
        stateLegend: "The lift is suspended.",
      },
      closed: {
        title: "",
        stateDesc: "",
        stateLegend:
          "We are currently closed. We look forward to your next visit!",
      },
    },
  },
  pt: {
    loading: "Consultando o estado atual do serviço",
    lastUpdated: "Última atualização",
    states: {
      normal: {
        title: "Serviço Normal:",
        stateDesc:
          "A subida é permitida a todos os passageiros, sem restrições.",
        stateLegend: "O meio de elevação opera normalmente.",
      },
      conditional: {
        title: "Serviço Condicional:",
        stateDesc: "Podem ocorrer atrasos devido a fatores climáticos.",
        stateLegend: "O meio de elevação opera de forma condicional.",
      },
      restricted: {
        title: "Serviço Condicional com Restrições:",
        stateDesc:
          "É muito provável que haja atrasos ou uma eventual suspensão do meio de elevação. Por esse motivo, a subida é limitada para grupos como gestantes, pessoas com mobilidade reduzida, idosos etc. Se você for subir, é preferível não ter nenhum outro compromisso.",
        stateLegend:
          "O meio de elevação encontra-se em serviço condicional com restrições.",
      },
      suspended: {
        title: "Serviço Suspenso:",
        stateDesc:
          "A subida de gôndola está interrompida; ou seja, não é possível subir.",
        stateLegend: "O meio de elevação encontra-se suspenso.",
      },
      closed: {
        title: "",
        stateDesc: "",
        stateLegend:
          "Atualmente estamos fechados. Esperamos pela sua próxima visita!",
      },
    },
  },
};

export function isServiceState(value: unknown): value is ServiceStateValues {
  return SERVICE_STATES.includes(value as ServiceStateValues);
}

export function getMaintenanceServiceStatusCopy(locale: MaintenanceLocale) {
  return SERVICE_STATUS_COPY[locale];
}

export function resolveMaintenanceServiceStatus(
  value: unknown,
  updatedAt: unknown,
  locale: MaintenanceLocale,
) {
  if (!isServiceState(value)) return null;

  const copy = SERVICE_STATUS_COPY[locale];
  const date = typeof updatedAt === "string" ? new Date(updatedAt) : null;
  const formattedUpdatedAt =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleString(locale, {
          dateStyle: "short",
          timeStyle: "short",
        })
      : null;

  return {
    state: value,
    ...copy.states[value],
    lastUpdated: copy.lastUpdated,
    formattedUpdatedAt,
  };
}
