"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils";

interface FaqItem {
  id: number;
  question: string;
  answer: string;
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
        className="flex w-full items-center justify-between gap-4 px-6 py-6 text-left text-xl font-semibold text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none md:text-2xl"
      >
        <span className="flex-1 leading-snug">{question}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-6 w-6 text-muted-foreground transition-transform duration-200 ease-out group-hover:text-primary motion-reduce:transition-none",
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
            "min-h-0 overflow-hidden px-6 motion-safe:transition-[opacity,padding] motion-safe:duration-200 motion-safe:ease-out",
            isOpen ? "pb-6 pt-4 opacity-100" : "pb-0 pt-0 opacity-0",
          )}
        >
          <p className="whitespace-pre-line text-lg leading-8 text-foreground/80 md:text-xl md:leading-8">
            {answer}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function FaqList({ faqs }: Props) {
  return (
    <section className="xl:max-w-[120rem] mx-auto w-full max-w-[100rem] px-3 sm:px-6 lg:px-10">
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
