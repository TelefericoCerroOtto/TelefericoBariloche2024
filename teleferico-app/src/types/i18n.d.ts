import { i18n } from "@/i18n";
import type { Link } from "@/types";

export type Locales = (typeof i18n.locales)[number];

// Some types were declared as `unknown` when they are actually `BlocksContent`. This was done
// to avoid TypeScript errors, specifically with `Paths` and `Subset`.
export interface TranslationKeys {
  components: {
    Navbar: {
      home: string;
      location: string;
      activities: string;
      explore: string;
      pricingschedules: string;
      news: string;
      foundation: string;
    };
    HoursOverview: {
      title: string;
      desc: unknown;
      items: Array<{
        id: number;
        tag: string;
        title: string;
        desc: unknown;
        alt: string;
      }>;
    };
    Footer: {
      socialitems: {
        ig: string;
        fb: string;
        tt: string;
      };
      menuitems: {
        jobs: string;
        contact: string;
        policies: string;
        faqs: string;
      };
      contact: {
        title: string;
        direction: string;
      };
    };
    ServiceButton: {
      error: unknown;
      button: {
        trigger: string;
        close: string;
      };
      modal: {
        states: Array<{
          order: number;
          state: string;
          stateLegend: string;
          title: string;
          stateDesc: string;
        }>;
        disclaimer: unknown;
      };
    };
  };
  pages: {
    home: {
      postersection: {
        title: string;
        desc: string;
        epigraph: string;
        imagealt: string;
        link: Link;
      };
    };
  };
}

// Recursive type to generate autocomplete paths
export type Paths<T, Prefix extends string = ""> = T extends object
  ? {
      [K in Extract<keyof T, string | number>]: T[K] extends object
        ? `${Prefix}${K}` | Paths<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[Extract<keyof T, string | number>]
  : never;

// Helper type that, given an object `T` and a string `K` following the
// `property1.property2` format (e.g., `"components.Navbar"`),
// recursively returns the corresponding type from `T`.
export type Subset<
  T,
  K extends string,
> = K extends `${infer Head}.${infer Rest}` // Splits the string into the part before and after the dot.
  ? Head extends keyof T
    ? Subset<T[Head], Rest> // Repeats the process on the `Head` property.
    : never
  : K extends keyof T
    ? T[K] // Base case: when there are no more dots, the property is returned.
    : never;

export type TranslationPaths = Paths<TranslationKeys>;
