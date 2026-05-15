"use client";

import { useLocale } from "@/hooks";
import {
  proseSizeClassMap,
  typography,
  type TypographyProsePreset,
  type TypographyProseSize,
} from "@/lib/constants/typography.const";
import { toCmsImageProxyUrl } from "@/lib/adapters";
import {
  isExternalHref,
  isHttpUrl,
  withLocalePrefix,
} from "@/lib/helpers/links";
import { StrapiBlocksPayload } from "@/types";
import {
  BlocksRenderer,
  type BlocksContent,
} from "@strapi/blocks-react-renderer";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface BlockRendererClientProps {
  readonly content: BlocksContent | StrapiBlocksPayload;
  className?: string;
  /** Preferred API: semantic preset aligned with `typography.const.ts`. When both props are provided, this wins. */
  prosePreset?: TypographyProsePreset;
  /** Compatibility fallback for existing raw Tailwind Typography sizing. Prefer `prosePreset` for new code. */
  proseSize?: TypographyProseSize;
}

export default function BlockRendererClient({
  content,
  className,
  prosePreset,
  proseSize,
}: BlockRendererClientProps) {
  const { locale } = useLocale();

  if (!content) return null;

  const resolvedProseSize = prosePreset
    ? typography.prose[prosePreset].proseSize
    : proseSize ?? typography.prose.body.proseSize;

  return (
    <article
      className={`prose max-w-none text-black ${proseSizeClassMap[resolvedProseSize]} ${className ?? ""}`}
    >
      <BlocksRenderer
        content={content as BlocksContent}
        blocks={{
          image: ({ image }) => (
            <Image
              src={toCmsImageProxyUrl(image.url) ?? image.url}
              width={image.width}
              height={image.height}
              alt={image.alternativeText || ""}
            />
          ),
          link: ({ children, url }) => {
            const external = isExternalHref(url);
            const opensNewTab = isHttpUrl(url);

            const href = !external ? withLocalePrefix(url, locale) : url;

            return (
              <Link
                href={href}
                className="inline-flex items-center text-red-600 no-underline hover:underline"
                target={opensNewTab ? "_blank" : undefined}
                rel={opensNewTab ? "noopener noreferrer" : undefined}
                prefetch={opensNewTab ? false : undefined}
              >
                {children}
                {opensNewTab ? (
                  <>
                    <ExternalLinkIcon
                      aria-hidden
                      className="ml-1 inline-block h-4 w-4"
                    />
                    <span className="sr-only">(opens in a new tab)</span>
                  </>
                ) : null}
              </Link>
            );
          },
        }}
      />
    </article>
  );
}
