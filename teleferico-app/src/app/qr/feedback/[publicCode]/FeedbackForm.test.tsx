import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FeedbackForm from "./FeedbackForm";

vi.mock("react-google-recaptcha", () => ({
  default: ({ onChange }: { onChange: (_token: string) => void }) => (
    <button type="button" onClick={() => onChange("captcha-token")}>
      Verify
    </button>
  ),
}));

const surveyResponse = {
  contractVersion: "feedback-public.v1",
  point: { pointKey: "summit", displayName: "Cumbre" },
  survey: {
    versionKey: "visitor-v1",
    translations: {
      es: {
        headerTitle: "Contanos cómo fue tu experiencia",
        overallQuestion: "¿Cómo fue tu experiencia general?",
        aspectsQuestion: "¿Qué aspectos querés destacar?",
        sentimentsQuestion: "¿Cómo calificarías cada aspecto?",
        commentQuestion: "¿Querés agregar un comentario?",
        verificationTitle: "Antes de enviar",
        verificationHint: "Completá la verificación para proteger este canal.",
        privacyNotice: "Tu respuesta nos ayuda a mejorar.",
        successTitle: "Gracias",
        successBody: "Tu respuesta fue recibida correctamente.",
      },
      en: {},
      pt: {},
    },
    aspects: [
      {
        aspectKey: "views",
        sortOrder: 1,
        labels: { es: "Vistas", en: "Views", pt: "Vistas" },
      },
    ],
  },
  sessionToken: "signed-session-token",
  expiresAt: "2026-09-18T14:00:00.000Z",
};

describe("FeedbackForm", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads the QR survey and keeps the ordered form controls accessible", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(surveyResponse))),
    );

    render(<FeedbackForm publicCode="summit-public" />);

    expect(
      await screen.findByRole("heading", {
        name: surveyResponse.survey.translations.es.headerTitle,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", {
        name: surveyResponse.survey.translations.es.overallQuestion,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  it("reuses the idempotency key when a malformed response is retried", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(surveyResponse)))
      .mockResolvedValueOnce(new Response("not-json", { status: 201 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            submissionReceipt: "receipt-1",
            acceptedAt: "2026-09-18T12:00:00.000Z",
            guardUntil: "2026-09-19T12:00:00.000Z",
          }),
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedbackForm publicCode="summit-public" />);
    await screen.findByRole("heading", {
      name: surveyResponse.survey.translations.es.headerTitle,
    });

    fireEvent.click(screen.getByRole("radio", { name: "5" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Vistas" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("radio", { name: "Positivo" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const submitButton = screen.getByRole("button", {
      name: "Enviar respuesta",
    });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Gracias" }),
      ).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/feedback/submissions",
      expect.objectContaining({ method: "POST" }),
    );
    const firstSubmission = JSON.parse(
      String(fetchMock.mock.calls[1][1]?.body),
    );
    const retrySubmission = JSON.parse(
      String(fetchMock.mock.calls[2][1]?.body),
    );
    expect(retrySubmission.idempotencyKey).toBe(firstSubmission.idempotencyKey);
  });
});
