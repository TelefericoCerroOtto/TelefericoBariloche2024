import { StrapiComponentRenderer } from "@/components";
import type { Locales, PagesBlocks } from "@/types";
import { Fragment, type ComponentType } from "react";

interface Props<T extends PagesBlocks> {
  blocks: T;
  customBlocks?: {
    position: number;
    component: ComponentType<{ locale: Locales }>;
  }[];
  locale: Locales;
}

export default function BlocksRenderer<T extends PagesBlocks>(props: Props<T>) {
  const { blocks, customBlocks = [], locale } = props;

  const validCustomBlocks = customBlocks.filter(
    (cb) => cb.position < blocks.length,
  );
  const extraCustomBlocks = customBlocks.filter(
    (cb) => cb.position >= blocks.length,
  );

  return (
    <>
      {blocks.map((block, idx) => {
        const selectedBlocks = validCustomBlocks.filter(
          (cb) => cb.position === idx,
        );

        return (
          <Fragment key={idx}>
            <StrapiComponentRenderer block={block} locale={locale} />
            {selectedBlocks.map((cb, index) => (
              <cb.component key={`custom-${idx}-${index}`} locale={locale} />
            ))}
          </Fragment>
        );
      })}

      {/* Renderizar los customBlocks que tienen posición fuera del rango al final */}
      {extraCustomBlocks.map((cb, index) => (
        <cb.component key={`extra-${index}`} locale={locale} />
      ))}
    </>
  );
}
