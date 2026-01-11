"use client";

import { Button } from "@heroui/react";
import type { Locales } from "@/types";

type Props = {
  locale: Locales;
  title?: string;
  message: string;
  onRetry?: () => void;
};

function getCopy(locale: Locales) {
  const l = String(locale);
  const isEs = l.startsWith("es");
  const isPt = l.startsWith("pt");

  return {
    defaultTitle: isPt
      ? "Ocorreu um problema"
      : isEs
        ? "Ocurrió un problema"
        : "Something went wrong",
    help: isPt
      ? "Tente novamente em alguns segundos. Se o problema persistir, volte mais tarde."
      : isEs
        ? "Probá nuevamente en unos segundos. Si el problema persiste, volvé a intentarlo más tarde."
        : "Try again in a few seconds. If the problem persists, please try again later.",
    retry: isPt ? "Tentar novamente" : isEs ? "Reintentar" : "Try again",
  };
}

function ErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 text-red-600"
      fill="none"
    >
      <path
        d="M12 9v5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 17h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ErrorState({ locale, title, message, onRetry }: Props) {
  const c = getCopy(locale);

  return (
    <section className="my-12 w-11/12 md:w-3/4 lg:w-7/12" aria-label={message}>
      <div
        role="alert"
        aria-live="polite"
        className="relative overflow-hidden rounded-2xl border border-default-200 bg-content1 shadow-sm after:absolute after:inset-x-0 after:top-0 after:h-1 after:bg-red-600"
      >
        <div className="p-5 sm:p-7 lg:p-10">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10">
              <ErrorIcon />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-default-900 sm:text-base lg:text-lg">
                {title ?? c.defaultTitle}
              </p>

              <p className="mt-1 text-sm text-default-600 sm:text-base">
                {message}
              </p>

              <p className="mt-3 text-xs text-default-500 sm:text-sm">
                {c.help}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  radius="full"
                  size="sm"
                  variant="flat"
                  className="border border-red-600/30 bg-red-600/10 text-red-700"
                  onPress={() =>
                    onRetry ? onRetry() : window.location.reload()
                  }
                >
                  {c.retry}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
