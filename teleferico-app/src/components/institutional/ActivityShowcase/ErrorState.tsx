"use client";

import { Button } from "@heroui/react";
import type { Locales } from "@/types";
import { useState } from "react";

type Props = {
  locale: Locales;
  title?: string;
  message: string;
  onRetry?: () => void | Promise<void>;
  retryDisabled?: boolean;
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

export default function ErrorState({
  locale,
  title,
  message,
  onRetry,
  retryDisabled,
}: Props) {
  const c = getCopy(locale);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    try {
      setIsRetrying(true);
      await Promise.resolve(onRetry());
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <section className="my-12 w-11/12 md:w-3/4 lg:w-7/12" aria-label={message}>
      <div
        role="alert"
        aria-live="polite"
        className="relative w-full overflow-hidden rounded-2xl border border-default-200 bg-content1 shadow-sm after:absolute after:inset-x-0 after:top-0 after:h-1 after:bg-red-600"
      >
        {/* min-h para que no haya salto brusco vs Loader/Showcase */}
        <div className="p-5 sm:p-7 lg:p-10">
          <div className="flex min-h-[420px] flex-col justify-center sm:min-h-[460px] lg:min-h-[520px]">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-600/10 sm:h-14 sm:w-14">
                <ErrorIcon />
              </div>

              <div className="min-w-0 max-w-2xl">
                <p className="text-base font-semibold text-default-900 sm:text-lg lg:text-2xl">
                  {title ?? c.defaultTitle}
                </p>

                <p className="mt-2 text-sm leading-relaxed text-default-600 sm:text-base lg:text-lg">
                  {message}
                </p>

                <p className="mt-4 text-xs text-default-500 sm:text-sm lg:text-base">
                  {c.help}
                </p>

                {onRetry ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button
                      radius="full"
                      size="sm"
                      variant="flat"
                      className="border border-red-600/30 bg-red-600/10 text-red-700 sm:text-base"
                      onPress={handleRetry}
                      isLoading={isRetrying}
                      isDisabled={retryDisabled || isRetrying}
                      aria-busy={isRetrying}
                    >
                      {c.retry}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
