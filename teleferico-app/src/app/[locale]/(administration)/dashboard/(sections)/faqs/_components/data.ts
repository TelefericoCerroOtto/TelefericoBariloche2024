import type { InputLocaleConfig } from "@/types";

export const questionConfig: InputLocaleConfig = {
  "es-AR": {
    label: "Pregunta",
    placeholder: "Ej.: ¿Cuál es el horario de atención?",
    name: "question_es-AR",
  },
  en: {
    label: "Question",
    placeholder: "Ej.: What are the opening hours?",
    name: "question_en",
  },
  pt: {
    label: "Pergunta",
    placeholder: "Ej.: Quais são os horários de atendimento?",
    name: "question_pt",
  },
};

export const answerConfig: InputLocaleConfig = {
  "es-AR": {
    label: "Respuesta",
    placeholder: "Ej.: Nuestro horario de atención es de 9 a 18 hs.",
    name: "answer_es-AR",
  },
  en: {
    label: "Answer",
    placeholder: "Ej.: Our opening hours are from 9 am to 6 pm.",
    name: "answer_en",
  },
  pt: {
    label: "Resposta",
    placeholder: "Ej.: Nosso horário de atendimento é das 9h às 18h.",
    name: "answer_pt",
  },
};
