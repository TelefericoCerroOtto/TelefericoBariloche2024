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

  const toggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-border/70 bg-background/70 shadow-sm transition-shadow motion-reduce:transition-none",
        isOpen ? "border-primary/60 shadow-md" : "hover:border-primary/40 hover:shadow-md",
      )}
    >
      <button
        type="button"
        id={identifiers.trigger}
        // aria-expanded/aria-controls expose the toggle state to assistive technologies.
        aria-controls={identifiers.panel}
        aria-expanded={isOpen}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-lg font-semibold text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
      >
        <span className="flex-1 leading-snug">{question}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200 ease-out group-hover:text-primary motion-reduce:transition-none",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
      <div
        id={identifiers.panel}
        role="region"
        // aria-labelledby pairs the panel with its button label for screen readers.
        aria-labelledby={identifiers.trigger}
        aria-hidden={!isOpen}
        className={cn(
          "grid overflow-hidden border-t border-border/70 text-base text-muted-foreground transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          className={cn(
            "px-6 pb-6 pt-4 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
            isOpen ? "opacity-100" : "opacity-0",
          )}
        >
          <p className="text-base leading-7 text-foreground/80 whitespace-pre-line">{answer}</p>
        </div>
      </div>
    </article>
  );
}

export default function FaqList({ faqs }: Props) {
  return (
    <div className="space-y-4">
      {faqs.map((faq) => (
        <Faq key={faq.id} {...faq} />
      ))}
    </div>
  );
}
