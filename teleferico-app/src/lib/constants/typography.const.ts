/**
 * Semantic institutional typography source of truth.
 * Prefer these intent-based tokens over ad-hoc `text-*` or `prose-*` classes in content surfaces.
 */
export const proseSizeClassMap = {
  sm: "prose-sm",
  base: "prose-base",
  lg: "prose-lg",
  xl: "prose-xl",
  "2xl": "prose-2xl",
  "3xl": "prose-2xl text-[1.875rem] leading-[1.6]",
} as const;

export type TypographyProseSize = keyof typeof proseSizeClassMap;

export const typography = {
  headings: {
    hero: "text-3xl md:text-4xl lg:text-6xl",
    section: "text-3xl md:text-4xl lg:text-6xl",
    feature: "text-4xl md:text-5xl",
    spotlight: "text-4xl md:text-5xl lg:text-6xl",
  },
  content: {
    section: "text-xl md:text-2xl lg:text-3xl",
    feature: "text-xl md:text-2xl",
  },
  meta: {
    eyebrow: "text-base md:text-lg lg:text-xl",
    featureEyebrow: "text-base md:text-lg",
  },
  ui: {
    prominentAction: "text-lg md:text-xl lg:text-3xl",
  },
  prose: {
    compact: { proseSize: "sm" as TypographyProseSize },
    body: { proseSize: "base" as TypographyProseSize },
    section: { proseSize: "xl" as TypographyProseSize },
    article: { proseSize: "xl" as TypographyProseSize },
    feature: { proseSize: "3xl" as TypographyProseSize },
  },
} as const;

type ValueOf<T> = T[keyof T];

export type TypographyHeadingKey = keyof typeof typography.headings;
export type TypographyContentKey = keyof typeof typography.content;
export type TypographyMetaKey = keyof typeof typography.meta;
export type TypographyUiKey = keyof typeof typography.ui;
export type TypographyPlainTextPreset =
  | TypographyHeadingKey
  | TypographyContentKey
  | TypographyMetaKey
  | TypographyUiKey;
export type TypographyPlainTextClassName =
  | ValueOf<typeof typography.headings>
  | ValueOf<typeof typography.content>
  | ValueOf<typeof typography.meta>
  | ValueOf<typeof typography.ui>;
export type TypographyProsePreset = keyof typeof typography.prose;
