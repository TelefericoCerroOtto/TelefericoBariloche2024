import { FormError, StrapiComponentRenderer } from "@/components";
import type { Locales, RendereableBlocks } from "@/types";
import { Fragment, type ComponentType } from "react";

interface Props {
  blocks: RendereableBlocks | RendereableBlocks[];
  customBlocks?: {
    position: number;
    component: ComponentType<{ locale: Locales }>;
  }[];
  locale: Locales;
}

export default function BlocksRenderer(props: Props) {
  const { blocks, customBlocks = [], locale } = props;

  if (!Array.isArray(blocks)) {
    return (
      <>
        <StrapiComponentRenderer block={blocks} locale={locale} />
        {customBlocks.map((cb, index) => (
          <cb.component key={index} locale={locale} />
        ))}
      </>
    );
  }

  if (!blocks || blocks.length === 0) {
    console.error("Missed blocks in BlocksRenderer component: ", blocks);
    return <FormError message="No content was found" />;
  }

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
