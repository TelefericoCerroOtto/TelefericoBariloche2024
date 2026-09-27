import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFeedbackDraftKey, type FeedbackDraft } from "@/lib/feedback/draft";
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
        receiptLabel: "Número de referencia:",
        successTitle: "Gracias",
        successBody: "Tu respuesta fue recibida correctamente.",
      },
      en: { receiptLabel: "Reference number:" },
      pt: { receiptLabel: "Número de referência:" },
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
    fireEvent.click(screen.getByRole("button", { name: "EN" }));
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
    expect(screen.getByText("receipt-1")).toBeInTheDocument();
    expect(screen.getByText("Reference number:")).toBeInTheDocument();
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

  it("forwards the filled honeypot value with the submission", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(surveyResponse)))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "VALIDATION_FAILED" } }), {
          status: 400,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<FeedbackForm publicCode="summit-public" />);
    await screen.findByRole("heading", {
      name: "Contanos cómo fue tu experiencia",
    });

    fireEvent.click(screen.getByRole("radio", { name: "5" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Vistas" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("radio", { name: "Positivo" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    const honeypot = container.querySelector<HTMLInputElement>(
      'input[name="website"]',
    );
    expect(honeypot).not.toBeNull();
    Object.defineProperty(honeypot, "value", {
      configurable: true,
      value: "bot-filled",
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar respuesta" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
      website: "bot-filled",
    });
  });

  it("restores locale and answers only from an unexpired draft for this point and version", async () => {
    localStorage.setItem("tb113-feedback-browser-context", "browser-test");
    const key = createFeedbackDraftKey("visitor-v1", "summit", "browser-test");
    const draft: FeedbackDraft = {
      locale: "en",
      stage: "sentiments",
      overallRating: 5,
      selectedAspectKeys: ["views"],
      sentiments: {},
      otherText: "",
      comment: "Saved comment",
      savedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    };
    localStorage.setItem(key, JSON.stringify(draft));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(surveyResponse))),
    );

    render(<FeedbackForm publicCode="summit-public" />);

    expect(
      await screen.findByRole("heading", {
        name: "¿Cómo calificarías cada aspecto?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "ES" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("Views")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Positivo" })).not.toBeChecked();
  });

  it.each([
    ["expired", "summit", "browser-test", { expiresAt: Date.now() - 1 }],
    ["another point", "base", "browser-test", {}],
    ["another browser session", "summit", "browser-other", {}],
  ])("does not restore locale from a %s draft", async (_case, pointKey, context, overrides) => {
    localStorage.setItem("tb113-feedback-browser-context", "browser-test");
    const draft: FeedbackDraft = {
      locale: "en",
      stage: "overall",
      overallRating: 5,
      selectedAspectKeys: [],
      sentiments: {},
      otherText: "",
      comment: "",
      savedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      ...overrides,
    };
    localStorage.setItem(
      createFeedbackDraftKey("visitor-v1", pointKey, context),
      JSON.stringify(draft),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(surveyResponse))),
    );

    render(<FeedbackForm publicCode="summit-public" />);

    await screen.findByRole("heading", {
      name: "Contanos cómo fue tu experiencia",
    });
    expect(screen.getByRole("button", { name: "ES" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
