"use client";

import {
  BlocksRenderer,
  type BlocksContent,
} from "@strapi/blocks-react-renderer";
import Image from "next/image";
import Link from "next/link";

export default function BlockRendererClient({
  content,
  className,
}: {
  readonly content: BlocksContent;
  className?: string;
}) {
  if (!content) return null;
  return (
    <article className={`prose max-w-none text-black ${className}`}>
      <BlocksRenderer
        content={content}
        blocks={{
          image: ({ image }) => {
            console.log(image);
            return (
              <Image
                src={image.url}
                width={image.width}
                height={image.height}
                alt={image.alternativeText || ""}
              />
            );
          },
          link: ({ children, url }) => (
            <Link
              href={url}
              className="text-custom-red no-underline hover:underline"
            >
              {children}
            </Link>
          ),
        }}
      />
    </article>
  );
}
