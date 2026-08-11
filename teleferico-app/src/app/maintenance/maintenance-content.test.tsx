import { render, screen } from "@testing-library/react";
import type { GetServiceStateResponse, ServiceStateValues } from "@/types";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
  resolveMaintenanceServiceStatus,
  type MaintenanceLocale,
} from "./maintenance-service-status";
import { MaintenanceStatusSection } from "./maintenance-status-section";

const MAINTENANCE_COPY = {
  title: "Work in progress",
  message: "The original maintenance explanation remains visible.",
} as const;

const STATE_COPY: Record<
  MaintenanceLocale,
  Record<
    ServiceStateValues,
    { title: string; stateDesc: string; stateLegend: string }
  >
> = {
  "es-AR": {
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
  en: {
    normal: {
      title: "Normal Service:",
      stateDesc: "Ascent is permitted for all passengers without restrictions.",
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
  pt: {
    normal: {
      title: "Serviço Normal:",
      stateDesc: "A subida é permitida a todos os passageiros, sem restrições.",
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
};

const LOCALES: MaintenanceLocale[] = ["es-AR", "en", "pt"];
const STATES: ServiceStateValues[] = [
  "normal",
  "conditional",
  "restricted",
  "suspended",
  "closed",
];

function buildServiceState(state: ServiceStateValues): GetServiceStateResponse {
  return {
    data: {
      id: 1,
      documentId: "service-state",
      createdAt: "2026-08-10T00:00:00.000Z",
      updatedAt: "2026-08-10T12:30:00.000Z",
      publishedAt: "2026-08-10T00:00:00.000Z",
      locale: null,
      state,
    },
    meta: {
      pagination: {
        page: 1,
        pageCount: 1,
        pageSize: 1,
        total: 1,
      },
    },
  };
}

describe("maintenance service status copy", () => {
  it.each(
    LOCALES.flatMap((locale) =>
      STATES.map((state) => [locale, state] as const),
    ),
  )("projects %s %s with localized static copy", (locale, state) => {
    const status = resolveMaintenanceServiceStatus(
      state,
      "2026-08-10T12:30:00.000Z",
      locale,
    );

    expect(status).not.toBeNull();
    expect(status?.title).toBe(STATE_COPY[locale][state].title);
    expect(status?.stateDesc).toBe(STATE_COPY[locale][state].stateDesc);
    expect(status?.stateLegend).toBe(STATE_COPY[locale][state].stateLegend);
    expect(status?.formattedUpdatedAt).not.toBeNull();
  });

  it("rejects invalid state and timestamp input without reflecting it", () => {
    const status = resolveMaintenanceServiceStatus(
      "private upstream detail",
      "invalid timestamp",
      "en",
    );

    expect(status).toBeNull();
    expect(JSON.stringify(status)).not.toContain("private upstream detail");
  });
});

describe("MaintenanceStatusSection", () => {
  it.each(LOCALES)("renders no legacy maintenance pills for %s", (locale) => {
    const { container } = render(
      createElement(MaintenanceStatusSection, {
        locale,
        maintenanceCopy: MAINTENANCE_COPY,
        isLoading: false,
        isError: true,
      }),
    );

    expect(
      container.querySelectorAll("[data-maintenance-card] span"),
    ).toHaveLength(0);
  });

  it("keeps the original maintenance card and adds service status after it", () => {
    const { container } = render(
      createElement(MaintenanceStatusSection, {
        locale: "en",
        maintenanceCopy: MAINTENANCE_COPY,
        serviceState: buildServiceState("normal"),
        isLoading: false,
        isError: false,
      }),
    );

    expect(screen.getByText(MAINTENANCE_COPY.title)).toBeInTheDocument();
    expect(screen.getByText(MAINTENANCE_COPY.message)).toBeInTheDocument();
    expect(
      container.querySelectorAll("[data-maintenance-card] span"),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll("[data-maintenance-card] .animate-spin"),
    ).toHaveLength(2);
    expect(
      screen.getByText("The lift is operating normally."),
    ).toBeInTheDocument();
    expect(screen.getByText("Normal Service:")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ascent is permitted for all passengers without restrictions.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Last updated:/)).toBeInTheDocument();

    const cards = container.querySelectorAll(
      "[data-maintenance-card], [data-service-status-card]",
    );
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute("data-maintenance-card");
    expect(cards[1]).toHaveAttribute("data-service-status-card", "normal");
  });

  it("renders closed legend and timestamp without empty title or body elements", () => {
    const { container } = render(
      createElement(MaintenanceStatusSection, {
        locale: "en",
        maintenanceCopy: MAINTENANCE_COPY,
        serviceState: buildServiceState("closed"),
        isLoading: false,
        isError: false,
      }),
    );

    const statusCard = container.querySelector(
      '[data-service-status-card="closed"]',
    );
    expect(
      screen.getByText(
        "We are currently closed. We look forward to your next visit!",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Last updated:/)).toBeInTheDocument();
    expect(statusCard?.querySelector("h2")).toBeNull();
    expect(statusCard?.querySelectorAll("p")).toHaveLength(2);
  });

  it("reserves a separate loading card without replacing maintenance content", () => {
    const { container } = render(
      createElement(MaintenanceStatusSection, {
        locale: "pt",
        maintenanceCopy: MAINTENANCE_COPY,
        isLoading: true,
        isError: false,
      }),
    );

    expect(screen.getByText(MAINTENANCE_COPY.title)).toBeInTheDocument();
    expect(
      screen.getByText("Consultando o estado atual do serviço"),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-service-status-card="loading"]'),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("omits only the service card on network error without leaking details", () => {
    const { container } = render(
      createElement(MaintenanceStatusSection, {
        locale: "en",
        maintenanceCopy: MAINTENANCE_COPY,
        serviceState: buildServiceState("restricted"),
        isLoading: false,
        isError: true,
      }),
    );

    expect(screen.getByText(MAINTENANCE_COPY.title)).toBeInTheDocument();
    expect(container.querySelector("[data-service-status-card]")).toBeNull();
    expect(
      screen.queryByText("private upstream detail"),
    ).not.toBeInTheDocument();
  });

  it("omits only the service card for an invalid runtime state", () => {
    const invalidResponse = buildServiceState("normal");
    invalidResponse.data.state =
      "private upstream detail" as ServiceStateValues;

    const { container } = render(
      createElement(MaintenanceStatusSection, {
        locale: "es-AR",
        maintenanceCopy: MAINTENANCE_COPY,
        serviceState: invalidResponse,
        isLoading: false,
        isError: false,
      }),
    );

    expect(screen.getByText(MAINTENANCE_COPY.title)).toBeInTheDocument();
    expect(container.querySelector("[data-service-status-card]")).toBeNull();
    expect(
      screen.queryByText("private upstream detail"),
    ).not.toBeInTheDocument();
  });

  it.each([{}, { data: null }])(
    "omits malformed payload %# without replacing maintenance content",
    (malformedPayload) => {
      const { container } = render(
        createElement(MaintenanceStatusSection, {
          locale: "en",
          maintenanceCopy: MAINTENANCE_COPY,
          serviceState: malformedPayload,
          isLoading: false,
          isError: false,
        }),
      );

      expect(screen.getByText(MAINTENANCE_COPY.title)).toBeInTheDocument();
      expect(container.querySelector("[data-service-status-card]")).toBeNull();
      expect(
        screen.queryByText("private upstream detail"),
      ).not.toBeInTheDocument();
    },
  );
});
