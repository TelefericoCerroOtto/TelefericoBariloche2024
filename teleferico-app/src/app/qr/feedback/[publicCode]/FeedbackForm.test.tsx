import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFeedbackDraftKey,
  type FeedbackDraft,
} from "@/lib/feedback/draft";
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
        localeLabel: "Idioma",
        progressLabel: "Pregunta {current} de {total}",
        overallQuestion: "¿Cómo fue tu experiencia general?",
        overallInstruction: "Seleccione una calificación del 1 al 5.",
        aspectsQuestion: "¿Qué aspectos querés destacar?",
        aspectsInstruction: "Seleccione hasta tres aspectos.",
        otherLabel: "Otro",
        sentimentQuestion: "¿Cómo calificarías cada aspecto?",
        sentimentInstruction: "Indique una valoración para cada aspecto.",
        commentQuestion: "¿Querés agregar un comentario?",
        commentInstruction: "El comentario es opcional.",
        commentLabel: "Comentario",
        personalDataWarning: "No incluya datos personales.",
        verificationTitle: "Antes de enviar",
        verificationInstruction: "Complete la verificación para continuar.",
        privacyNotice: "Tu respuesta nos ayuda a mejorar.",
        backLabel: "Atrás",
        nextLabel: "Continuar",
        submitLabel: "Enviar respuesta",
        loadingStatus: "Cargando la encuesta…",
        ratingRequired: "Seleccione una calificación para continuar.",
        aspectsRequired: "Seleccione al menos un aspecto para continuar.",
        otherRequired: "Describa el aspecto seleccionado.",
        sentimentsRequired: "Indique una valoración para cada aspecto.",
        verificationFailed: "No se pudo completar la verificación.",
        submittingStatus: "Enviando respuesta…",
        genericFailure: "No se pudo enviar la respuesta. Intente nuevamente.",
        successTitle: "Gracias por compartir su experiencia.",
        successMessage: "La respuesta se recibió correctamente.",
        receiptLabel: "Número de referencia:",
      },
      en: {
        headerTitle: "Tell us about your experience",
        localeLabel: "Language",
        progressLabel: "Question {current} of {total}",
        overallQuestion: "How was your overall experience?",
        overallInstruction: "Select a rating from 1 to 5.",
        aspectsQuestion: "Which aspects would you like to highlight?",
        aspectsInstruction: "Select up to three aspects.",
        otherLabel: "Other",
        sentimentQuestion: "How would you rate each aspect?",
        sentimentInstruction: "Choose a rating for each selected aspect.",
        commentQuestion: "Would you like to add a comment?",
        commentInstruction: "Comments are optional.",
        commentLabel: "Comment",
        personalDataWarning: "Do not include personal data.",
        verificationTitle: "Before you submit",
        verificationInstruction: "Complete verification to continue.",
        privacyNotice: "Your response helps us improve.",
        backLabel: "Back",
        nextLabel: "Continue",
        submitLabel: "Submit response",
        loadingStatus: "Loading the survey…",
        ratingRequired: "Select a rating to continue.",
        aspectsRequired: "Select at least one aspect to continue.",
        otherRequired: "Describe the selected aspect.",
        sentimentsRequired: "Choose a rating for each aspect.",
        verificationFailed: "Verification could not be completed.",
        submittingStatus: "Submitting response…",
        genericFailure:
          "The response could not be submitted. Please try again.",
        successTitle: "Thank you for sharing your experience.",
        successMessage: "Your response was received.",
        receiptLabel: "Reference number:",
      },
      pt: {
        headerTitle: "Conte-nos sobre sua experiência",
        localeLabel: "Idioma",
        progressLabel: "Pergunta {current} de {total}",
        overallQuestion: "Como foi sua experiência geral?",
        overallInstruction: "Selecione uma avaliação de 1 a 5.",
        aspectsQuestion: "Quais aspectos você gostaria de destacar?",
        aspectsInstruction: "Selecione até três aspectos.",
        otherLabel: "Outro",
        sentimentQuestion: "Como você avaliaria cada aspecto?",
        sentimentInstruction:
          "Escolha uma avaliação para cada aspecto selecionado.",
        commentQuestion: "Você gostaria de adicionar um comentário?",
        commentInstruction: "O comentário é opcional.",
        commentLabel: "Comentário",
        personalDataWarning: "Não inclua dados pessoais.",
        verificationTitle: "Antes de enviar",
        verificationInstruction: "Conclua a verificação para continuar.",
        privacyNotice: "Sua resposta nos ajuda a melhorar.",
        backLabel: "Voltar",
        nextLabel: "Continuar",
        submitLabel: "Enviar resposta",
        loadingStatus: "Carregando a pesquisa…",
        ratingRequired: "Selecione uma avaliação para continuar.",
        aspectsRequired: "Selecione pelo menos um aspecto para continuar.",
        otherRequired: "Descreva o aspecto selecionado.",
        sentimentsRequired: "Escolha uma avaliação para cada aspecto.",
        verificationFailed: "Não foi possível concluir a verificação.",
        submittingStatus: "Enviando resposta…",
        genericFailure: "Não foi possível enviar a resposta. Tente novamente.",
        successTitle: "Agradecemos por compartilhar sua experiência.",
        successMessage: "Sua resposta foi recebida.",
        receiptLabel: "Número de referência:",
      },
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
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
};

describe("FeedbackForm", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses the complete published 31-key translation shape in every locale", () => {
    for (const locale of ["es", "en", "pt"] as const) {
      expect(
        Object.keys(surveyResponse.survey.translations[locale]),
      ).toHaveLength(31);
    }
  });

  it("preserves the server-backed dynamic aspect catalog and custom-text bound", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(surveyResponse))),
    );

    render(<FeedbackForm publicCode="summit-public" />);
    await screen.findByRole("heading", {
      name: surveyResponse.survey.translations.es.headerTitle,
    });
    fireEvent.click(screen.getByRole("radio", { name: "5" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      screen.getByRole("checkbox", { name: "Vistas" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Otro" }));
    expect(screen.getByRole("textbox", { name: "Otro" })).toHaveAttribute(
      "maxLength",
      "300",
    );
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
    expect(screen.queryByText("Cumbre")).not.toBeInTheDocument();
    expect(
      screen.getByRole("main", {
        name: surveyResponse.survey.translations.es.headerTitle,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Teleférico Cerro Otto" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Idioma" })).toHaveValue("es");
    expect(
      screen.getByRole("group", {
        name: surveyResponse.survey.translations.es.overallQuestion,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "5" })).toBeInTheDocument();
    const form = screen
      .getByRole("button", { name: "Continuar" })
      .closest("form");
    const footer = form?.querySelector(".feedback-form-footer");
    expect(footer).toContainElement(
      screen.getByRole("button", { name: "Continuar" }),
    );
    expect(form?.querySelector(".feedback-stage-viewport")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  it("keeps the branded loading shell coherent before survey translations arrive", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );

    render(<FeedbackForm publicCode="summit-public" />);

    expect(
      screen.getByRole("main", { name: "Cargando la encuesta…" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Cargando la encuesta…",
    );
    expect(screen.queryByText("Cumbre")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Teleférico Cerro Otto" }),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Idioma de la encuesta" }),
      { target: { value: "pt" } },
    );
    expect(
      screen.getByRole("main", { name: "Carregando a pesquisa…" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando a pesquisa…",
    );
  });

  it("announces survey load errors and retries within the branded shell", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(surveyResponse)));
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedbackForm publicCode="summit-public" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cargar la encuesta. Intente nuevamente más tarde.",
    );
    expect(screen.queryByText("Cumbre")).not.toBeInTheDocument();
    expect(
      screen.getByRole("main", {
        name: "No se pudo cargar la encuesta. Intente nuevamente más tarde.",
      }),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Idioma de la encuesta" }),
      { target: { value: "en" } },
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The survey could not be loaded. Please try again later.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("heading", {
        name: surveyResponse.survey.translations.en.headerTitle,
      }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an already-expired survey response without retaining an old draft", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-18T12:00:00.000Z"));
    try {
      const browserContext = "expired-response-test";
      const now = Date.now();
      localStorage.setItem("tb113-feedback-browser-context", browserContext);
      const key = createFeedbackDraftKey(
        "visitor-v1",
        "summit",
        browserContext,
      );
      const draft: FeedbackDraft = {
        locale: "en",
        stage: "comment",
        overallRating: 5,
        selectedAspectKeys: ["views"],
        sentiments: { views: "positive" },
        otherText: "",
        comment: "Free text from the expired survey",
        savedAt: now - 1_000,
        expiresAt: now + 60 * 60 * 1000,
      };
      localStorage.setItem(key, JSON.stringify(draft));
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ...surveyResponse,
              expiresAt: new Date(now - 1).toISOString(),
            }),
          ),
        ),
      );

      render(<FeedbackForm publicCode="summit-public" />);
      await act(async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await Promise.resolve();
        }
      });

      expect(screen.getByRole("alert")).toHaveTextContent(
        "La sesión de esta encuesta venció.",
      );
      expect(localStorage.getItem(key)).toBeNull();
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Enviar respuesta" }),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not re-persist a free-text draft after its QR session expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(
      new Date(Date.parse(surveyResponse.expiresAt) - 2 * 60 * 60 * 1000),
    );
    try {
      localStorage.setItem("tb113-feedback-browser-context", "expiry-test");
      const key = createFeedbackDraftKey("visitor-v1", "summit", "expiry-test");
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(surveyResponse)))
        .mockResolvedValueOnce(new Response(JSON.stringify(surveyResponse)));
      vi.stubGlobal("fetch", fetchMock);

      render(<FeedbackForm publicCode="summit-public" />);
      await act(async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await Promise.resolve();
        }
      });

      fireEvent.click(screen.getByRole("radio", { name: "5" }));
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Vistas" }));
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      fireEvent.click(screen.getByRole("radio", { name: "Positivo" }));
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Comentario" }), {
        target: { value: "Personal free-text that must expire" },
      });
      expect(localStorage.getItem(key)).toContain(
        "Personal free-text that must expire",
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
      });

      expect(localStorage.getItem(key)).toBeNull();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "La sesión de esta encuesta venció.",
      );
      expect(
        screen.queryByRole("button", { name: "Enviar respuesta" }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      await act(async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await Promise.resolve();
        }
      });
      expect(screen.getByRole("alert")).toHaveTextContent(
        "La sesión de esta encuesta venció.",
      );
      expect(localStorage.getItem(key)).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Enviar respuesta" }),
      ).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps an accepted receipt visible after the original expiry deadline", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(
      new Date(Date.parse(surveyResponse.expiresAt) - 2 * 60 * 60 * 1000),
    );
    try {
      localStorage.setItem(
        "tb113-feedback-browser-context",
        "receipt-expiry-test",
      );
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(surveyResponse)))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              submissionReceipt: "accepted-before-expiry",
              acceptedAt: "2026-09-18T12:30:00.000Z",
              guardUntil: "2026-09-19T12:30:00.000Z",
            }),
            { status: 201 },
          ),
        );
      vi.stubGlobal("fetch", fetchMock);

      render(<FeedbackForm publicCode="summit-public" />);
      await act(async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await Promise.resolve();
        }
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

      await act(async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await Promise.resolve();
        }
      });
      expect(screen.getByText("accepted-before-expiry")).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
      });

      expect(
        screen.getByRole("heading", {
          name: "Gracias por compartir su experiencia.",
        }),
      ).toBeInTheDocument();
      expect(screen.getByText("accepted-before-expiry")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    { locale: "es", label: "Volver al inicio", href: "/es-AR" },
    { locale: "en", label: "Back to home", href: "/en" },
    { locale: "pt", label: "Voltar ao início", href: "/pt" },
  ] as const)(
    "shows the accepted receipt and a localized home link for $locale without reopening the form",
    async ({ locale, label, href }) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(surveyResponse)))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              submissionReceipt: "accepted-receipt",
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
      if (locale !== "es") {
        fireEvent.change(screen.getByRole("combobox", { name: "Idioma" }), {
          target: { value: locale },
        });
      }

      fireEvent.click(screen.getByRole("radio", { name: "5" }));
      const nextLabel = surveyResponse.survey.translations[locale].nextLabel;
      const submitLabel = surveyResponse.survey.translations[locale].submitLabel;
      fireEvent.click(screen.getByRole("button", { name: nextLabel }));
      fireEvent.click(screen.getByRole("checkbox", { name: /vistas|views/i }));
      fireEvent.click(screen.getByRole("button", { name: nextLabel }));
      fireEvent.click(screen.getByRole("radio", { name: /positivo|positive/i }));
      fireEvent.click(screen.getByRole("button", { name: nextLabel }));
      fireEvent.click(screen.getByRole("button", { name: nextLabel }));
      fireEvent.click(screen.getByRole("button", { name: "Verify" }));
      fireEvent.click(screen.getByRole("button", { name: submitLabel }));

      expect(await screen.findByText("accepted-receipt")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: surveyResponse.survey.translations[locale].successTitle,
        }),
      ).toBeInTheDocument();
      expect(screen.queryByText("Cumbre")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        surveyResponse.survey.translations[locale].successMessage,
      );
      const homeLink = screen.getByRole("link", { name: label });
      expect(homeLink).toHaveAttribute("href", href);
      expect(
        screen.queryByRole("button", {
          name: /submit another|enviar otra|enviar nova/i,
        }),
      ).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it("blocks stale-session resubmission after the server returns SESSION_EXPIRED", async () => {
    localStorage.setItem(
      "tb113-feedback-browser-context",
      "server-expiry-test",
    );
    const key = createFeedbackDraftKey(
      "visitor-v1",
      "summit",
      "server-expiry-test",
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(surveyResponse)))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "SESSION_EXPIRED" } }), {
          status: 410,
        }),
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

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La sesión de esta encuesta venció.",
    );
    expect(
      screen.queryByRole("button", { name: "Enviar respuesta" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
    expect(localStorage.getItem(key)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      locale: "en",
      title: "Tell us about your experience",
      nextLabel: "Continue",
      aspectsQuestion: "Which aspects would you like to highlight?",
      aspectsInstruction: "Select up to three aspects.",
      aspectSelectionCount: "0 of 3 aspects selected.",
      aspectLabel: "Views",
      sentimentLabel: "Positive",
      commentQuestion: "Would you like to add a comment?",
      commentLabel: "Comment",
      commentInstruction: "Comments are optional.",
      personalDataWarning: "Do not include personal data.",
    },
    {
      locale: "pt",
      title: "Conte-nos sobre sua experiência",
      nextLabel: "Continuar",
      aspectsQuestion: "Quais aspectos você gostaria de destacar?",
      aspectsInstruction: "Selecione até três aspectos.",
      aspectSelectionCount: "Você selecionou 0 de 3 aspectos.",
      aspectLabel: "Vistas",
      sentimentLabel: "Positivo",
      commentQuestion: "Você gostaria de adicionar um comentário?",
      commentLabel: "Comentário",
      commentInstruction: "O comentário é opcional.",
      personalDataWarning: "Não inclua dados pessoais.",
    },
  ])(
    "uses complete published $locale copy for the public form",
    async (copy) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(JSON.stringify(surveyResponse))),
      );

      render(<FeedbackForm publicCode="summit-public" />);
      await screen.findByRole("heading", {
        name: surveyResponse.survey.translations.es.headerTitle,
      });

      fireEvent.change(
        screen.getByRole("combobox", {
          name: surveyResponse.survey.translations.es.localeLabel,
        }),
        { target: { value: copy.locale } },
      );
      expect(
        screen.getByRole("heading", { name: copy.title }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("radio", { name: "5" }));
      fireEvent.click(screen.getByRole("button", { name: copy.nextLabel }));

      expect(
        screen.getByRole("heading", { name: copy.aspectsQuestion }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole("heading", { name: copy.aspectsQuestion }),
        ),
      );
      expect(screen.getByText(copy.aspectsInstruction)).toBeInTheDocument();
      expect(screen.getByText(copy.aspectSelectionCount)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("checkbox", { name: copy.aspectLabel }));
      expect(
        screen.getByText(copy.aspectSelectionCount.replace("0", "1")),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: copy.nextLabel }));
      fireEvent.click(screen.getByRole("radio", { name: copy.sentimentLabel }));
      fireEvent.click(screen.getByRole("button", { name: copy.nextLabel }));

      expect(
        screen.getByRole("heading", { name: copy.commentQuestion }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: copy.commentLabel }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: copy.commentLabel }),
      ).toHaveAttribute(
        "aria-describedby",
        "feedback-comment-instruction feedback-comment-warning feedback-comment-limit",
      );
      expect(screen.getByText(copy.commentInstruction)).toBeInTheDocument();
      expect(screen.getByText(copy.personalDataWarning)).toBeInTheDocument();
    },
  );

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
    expect(
      await screen.findByRole("heading", { name: "Antes de enviar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enviar respuesta" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(
      screen.getByRole("button", { name: "Enviar respuesta" }),
    ).toBeEnabled();
    fireEvent.change(screen.getByRole("combobox", { name: "Idioma" }), {
      target: { value: "en" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit response" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const submitButton = screen.getByRole("button", {
      name: "Submit response",
    });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: "Thank you for sharing your experience.",
        }),
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
        name: "How would you rate each aspect?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue(
      "en",
    );
    expect(screen.getByText("Views")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Positive" })).not.toBeChecked();
  });

  it.each([
    ["expired", "summit", "browser-test", { expiresAt: Date.now() - 1 }],
    ["another point", "base", "browser-test", {}],
    ["another browser session", "summit", "browser-other", {}],
  ])(
    "does not restore locale from a %s draft",
    async (_case, pointKey, context, overrides) => {
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
      expect(screen.getByRole("combobox", { name: "Idioma" })).toHaveValue(
        "es",
      );
    },
  );
});
