"use client";

import { BlockRendererClient } from "@/components";
import type { StrapiBlocksPayload } from "@/types";
import { cn } from "@/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface FaqItem {
  id: number;
  question: string;
  answer: StrapiBlocksPayload;
}

interface Props {
  faqs: FaqItem[];
}

function Faq({ id, question, answer }: FaqItem) {
  const [isOpen, setIsOpen] = useState(false);
  const baseId = `faq-${id}`;
  const identifiers = {
    trigger: `${baseId}-trigger`,
    panel: `${baseId}-panel`,
  };

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-border/70 bg-background/70 shadow-sm transition-shadow motion-reduce:transition-none",
        isOpen
          ? "border-primary/60 shadow-md"
          : "hover:border-primary/40 hover:shadow-md",
      )}
    >
      <button
        type="button"
        id={identifiers.trigger}
        aria-controls={identifiers.panel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((p) => !p)}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left text-lg font-semibold text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none sm:items-center sm:px-6 sm:py-6 sm:text-2xl md:text-3xl"
      >
        <span className="min-w-0 flex-1 leading-snug">{question}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-hover:text-primary motion-reduce:transition-none sm:h-6 sm:w-6",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {/* Panel colapsable */}
      <div
        id={identifiers.panel}
        role="region"
        aria-labelledby={identifiers.trigger}
        aria-hidden={!isOpen}
        className={cn(
          "grid border-t border-border/70 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden px-4 motion-safe:transition-[opacity,padding] motion-safe:duration-200 motion-safe:ease-out sm:px-6",
            isOpen ? "pb-5 pt-3 opacity-100 sm:pb-6 sm:pt-4" : "pb-0 pt-0 opacity-0",
          )}
        >
          <BlockRendererClient content={answer} proseSize="lg" />
        </div>
      </div>
    </article>
  );
}

export default function FaqList({ faqs }: Props) {
  return (
    <section className="mx-auto w-full max-w-[100rem] px-3 sm:px-6 lg:max-w-[120rem] lg:px-10">
      <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
        {faqs.map((faq) => (
          <div key={faq.id}>
            <Faq {...faq} />
          </div>
        ))}
      </div>
    </section>
  );
}
