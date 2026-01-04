"use client";

import { useLocale } from "@/hooks";
import {
  isExternalHref,
  isHttpUrl,
  withLocalePrefix,
} from "@/lib/helpers/links";
import {
  BlocksRenderer,
  type BlocksContent,
} from "@strapi/blocks-react-renderer";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function BlockRendererClient({
  content,
  className,
}: {
  readonly content: BlocksContent;
  className?: string;
}) {
  const { locale } = useLocale();

  if (!content) return null;

  return (
    <article
      className={`prose max-w-none text-base text-black md:text-xl lg:text-2xl ${className}`}
    >
      <BlocksRenderer
        content={content}
        blocks={{
          image: ({ image }) => (
            <Image
              src={image.url}
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
