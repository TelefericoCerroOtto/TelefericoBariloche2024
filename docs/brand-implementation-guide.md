# Brand Implementation Guide — Teleférico Cerro Otto

This guide documents the visual identity of the Teleférico Cerro Otto website as it exists today. It is the authoritative reference for agents and contributors implementing new pages, visual components, or design-significant UI changes. All values here reflect decisions that were made and validated by the owner — do not change them without explicit instruction.

## Purpose

Read this guide before implementing any page or visual component. Use it to:

- Choose the correct red for each surface area.
- Apply the established brand motifs rather than inventing new ones.
- Select the right logo variant for the background context.
- Match the visual tone: modern, warm, and confidently touristic.

**Quick rule**: when in doubt, look for a similar component that already exists and replicate its structure rather than introducing something new.

---

## Color Palette

### Brand Reds — surface-area rule

The most important color decision in this project is which red to use on which surface. The logo red (#D31515) was tested on large surfaces (navbar, footer) and found too harsh. A deeper red was deliberately chosen for those areas.

| Token / Value | Name | Where to use |
|---|---|---|
| `--custom-red` / `#9F1212` | Brand Deep Red | Large chrome: navbar, footer, full-width banners |
| `#D31515` | Brand Bright Red | SVG logos only; small iconic accents tied to the logo element |
| `--primary` / `hsl(0 88% 50%)` ≈ `#F01414` | Action Red | Buttons, focus rings, interactive CTAs |
| `red-500` / `#EF4444` | Accent Red (light) | Decorative at low opacity: `ring-red-500/15`, `HighlightLastWord`, dot textures |
| `red-600` / `#DC2626` | Accent Red (mid) | Gradient ribbons: `from-red-600 via-rose-500 to-red-500` |

**Do not introduce new reds outside this palette.**

### Secondary / Complementary Brand Blue

`#3B70CB` is the owner-approved secondary/complementary brand blue for the EditorialAlert `info` surface, paired with opaque white text. It is an editorial brand role, not an operational status color or a global CSS token.

### Status Colors

These are feedback colors, not brand identity. Use them exclusively inside `AppAlert`. The operational info blue remains `#0B4795`; it is distinct from the EditorialAlert brand blue `#3B70CB`.

| Token | Value | Use |
|---|---|---|
| `--custom-green` | `#045009` | Success feedback |
| `--custom-blue` | `#0b4795` | Info feedback |
| `--custom-orange` | `#ce6700` | Warning feedback |

### Neutrals

| Role | Value / Token |
|---|---|
| Background | `#FFFFFF` |
| Foreground | `hsl(0 0% 3.9%)` — near-black, used via `text-foreground` |
| Body text | `text-foreground/80` |
| Secondary text | `text-foreground/70` |
| Tertiary text | `text-foreground/60` |
| Hairline dividers | `--custom-border` / `#dedfe2` |

### Inactive tokens (do not use)

- `.dark` block: fully declared but dark mode is never activated. Not a brand decision.
- `chart-*`, `sidebar-*`, most `popover-*`, `accent-*`, `muted-*`: shadcn boilerplate. Ignore for brand work.

---

## Typography

Single font family: **Outfit** (Google Fonts, geometric sans-serif). No secondary typeface.

```ts
// next/font/google
{ subsets: ["latin"], display: "swap" }
```

Global base: `text-2xl` on body, `leading-8` on institutional layout. This intentionally large base is part of the identity.

### Type scale

Defined in `src/lib/constants/typography.const.ts`:

| Token | Classes |
|---|---|
| `headings.hero` | `text-3xl md:text-4xl lg:text-6xl` |
| `headings.section` | `text-3xl md:text-4xl lg:text-6xl` |
| `headings.feature` | `text-4xl md:text-5xl` |
| `headings.spotlight` | `text-4xl md:text-5xl lg:text-6xl` |
| `content.section` | `text-xl md:text-2xl lg:text-3xl` |
| `content.feature` | `text-xl md:text-2xl` |
| `meta.eyebrow` | `text-base md:text-lg lg:text-xl` |

### Treatment rules

| Element | Classes |
|---|---|
| Headings | `font-bold`, often `capitalize` or `uppercase` |
| Eyebrow / kicker | `uppercase tracking-[0.35em]` or `tracking-[0.28em]`, `text-foreground/70` or `text-primary` |
| Body copy | `leading-relaxed text-foreground/80 text-pretty text-center` |
| Prose blocks | `@tailwindcss/typography` — `prose-sm` through `prose-2xl` |

---

## Layout and Spacing

### Breakpoints

These override Tailwind defaults. Use these values when reasoning about responsive behavior.

| Prefix | Width |
|---|---|
| `sm` | 640px |
| `md` | 820px (not 768) |
| `lg` | 1366px (laptop width, not 1024) |

### Container and rhythm

| Rule | Value |
|---|---|
| Content container | `max-w-[1536px]` with `px-6 md:px-12` gutters |
| Section vertical rhythm | `my-14` — dominant spacing between content sections |
| Page wrapper | `flex flex-col items-center justify-center` |

### Page composition model

The CMS drives page structure. `BlocksRenderer` iterates Strapi content blocks; each block renders as a section. An `isInverted` flag alternates layout direction (`lg:flex-row` vs `lg:flex-row-reverse`) to create visual variety without new component variants.

---

## Brand Motifs

These are the recurring visual patterns that define the site's character. Use them on institutional pages. Do not invent visual alternatives — reach for these first.

### 1. LogoBadge

A 40px rounded-full chip containing the 20px gondola SVG. Placed beside section titles in `ImageTextSection` variants.

```tsx
<div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
  <GondolaSVG className="h-5 w-5" />
</div>
```

The gondola is the brand's atomic icon. It can appear independently as an accent.

### 2. HighlightLastWord

The last word of a section title is rendered in `text-red-500`. Signature treatment used throughout institutional pages.

```tsx
// Example: "Descubrí la <span className="text-red-500">montaña</span>"
```

### 3. Red ring cards

Content cards carry a subtle `ring-1 ring-red-500/15`. Consistent warm tint that ties cards to the red palette without overpowering.

### 4. Cable line motif

A thin `h-px bg-border` line with a small `rounded-full bg-primary` dot — abstracts the suspended cable concept. Used as a decorative section divider.

### 5. Gradient ribbon / rail

`bg-gradient-to-r from-red-600 via-rose-500 to-red-500` — used as accent bars in Spotlight and Poster variants.

### 6. Kicker chip

Category label for news, maintenance notices, and similar content.

```tsx
<span className="rounded-full border bg-custom-red/10 text-custom-red uppercase tracking-[0.28em] text-sm px-3 py-1">
  Noticias
</span>
```

### 7. Red dot-grid texture

Subtle background texture. Apply with caution — it should be nearly invisible.

```css
background-image: radial-gradient(#ef4444 1px, transparent 1px);
opacity: 0.05;
```

---

## Component Patterns

### Shape and depth

| Property | Value |
|---|---|
| Card border radius | `rounded-3xl` |
| Buttons, badges, pills | `rounded-full` |
| Card shadow | `shadow-xl shadow-black/10` or `shadow-2xl shadow-black/15` |
| Floating surfaces | `bg-background/50 backdrop-blur-md` |

### Buttons (`ButtonDos.tsx` with CVA)

Base: `rounded-full font-bold active:scale-95 transition-colors h-12` (small: `h-9`).

| Intent | Appearance |
|---|---|
| `solid` | `bg-primary text-white` |
| `outlineRed` | `border-primary text-primary` |
| `outlineWhite` | White border and text — for dark/red backgrounds |
| `ghost` | Transparent background variants |

### Images

- Frame: `rounded-3xl object-cover`
- Common aspect ratios: `4/3`, `24/7`, `21/9`, `9/16`, `1/1`
- Text legibility overlays: `bg-black/10` through `bg-black/40` gradient scrims

### Hover and interaction

| Element | Animation |
|---|---|
| Image in card | `group-hover:scale-[1.02] duration-500` (guarded with `motion-reduce`) |
| Button press | `active:scale-95` |
| Card lift | `hover:-translate-y-1` |
| Nav link underline | `scale-x` animation |

### Accessibility (maintain this standard)

- Focus: `focus-visible:ring-2 ring-primary ring-offset-2` on all interactive elements
- Decorative elements: `aria-hidden="true"`
- Screen-reader text: `sr-only`
- Reduced motion: `motion-reduce:transition-none` on all animated elements

**Do not regress this standard when adding new components.**

---

## Graphic Assets

### Logo — visual composition

The logo has three main figures:

1. **Confitería giratoria** (rotating restaurant): a stylized building at the top — red roof, white windows, black border. Represents the landmark rotating restaurant at the summit of Cerro Otto.
2. **Gondola cabins**: three pill-shaped cable car cabins descending along a curved cable line — white window band at the top, red body below, black border.
3. **Wordmark**: "TELEFÉRICO" (upper line) + "CERRO OTTO" (lower line) in a bold geometric sans-serif.

### Logo variant manifest

| File | Description | Border/text | Windows | Roof/body | When to use |
|---|---|---|---|---|---|
| `logo.svg` | Full logo | Black | White (confitería + gondolas) | Red `#D31515` | Light backgrounds; navbar solid/scrolled state |
| `logo-negativo.svg` | Full logo, negative | White | Black (confitería + gondolas) | Red `#D31515` | Dark/photo backgrounds where red should pop; navbar transparent state |
| `logo-blanco.svg` | Full logo, white variant | White | Red (confitería + gondolas) | Red `#9F1212` | Footer; dark panels; any dark background |

### Extracted elements

| File | Source element | Colors | When to use |
|---|---|---|---|
| `logo-recortado.svg` | Confitería icon only (extracted from `logo.svg`) | Same as `logo.svg`: black border, white windows, red roof | Watermarks; favicon-sized usage; subtle branding (e.g. `opacity-[0.06]`) |
| `gondola.svg` | Single gondola cabin (extracted from `logo.svg`) | Same as `logo.svg`: black border, white window, red body | `LogoBadge` component; small iconic accents; decorative elements |
| `favicon.ico` | `logo-recortado.svg` in `.ico` format | Same as `logo-recortado.svg` | Browser tab favicon |

### Related organization logo

| File | Description | When to use |
|---|---|---|
| `fsmflogo.svg` | Fundación Sara María Furman. Two text lines ("FUNDACION" in uppercase sans-serif + "Sara María Furman" in script serif, both white) to the left of an isotipo: a simplified human figure with arms raised, white body, red heart in place of the head. | Dark backgrounds only (no negative variant exists). Use only in contexts that reference the foundation. |

### Logo usage rules

- The gondola element **can** be used independently as a decorative or iconic element.
- The confitería element (`logo-recortado`) **can** be used as a watermark or subtle brand mark.
- **Do not** decompose the full logo SVG into arbitrary parts.
- **Do not** rearrange or recombine the internal SVG paths.
- On a red (`#9F1212`) background → use `logo-negativo.svg`.
- On a white or light background → use `logo.svg`.
- On a dark or photographic background → use `logo-blanco.svg` or `logo-negativo.svg`.
- Social media logos (`iglogo.svg`, `ytlogo.svg`, `fblogo.svg`) and `oc-time-flies.svg` are third-party assets, not brand identity elements.

---

## Visual Tone

The site reads as **modern, warm, and confidently touristic** — not a formal government portal.

| Quality | Expression |
|---|---|
| Approachable premium | Large rounded shapes, generous whitespace (`my-14`), soft tinted shadows, bold single-color identity |
| Energy and warmth | Red palette used consistently but not aggressively |
| Altitude and adventure | Cable car motifs; confitería giratoria silhouette; gradient ribbons; the gondola icon |
| Patagonian pride | "Bariloche · Patagonia" kickers on section eyebrows |
| International positioning | Trilingual (es-AR / en / pt) by design — reinforces tourist destination audience |
| Authority shown subtly | Deep red chrome (navbar/footer), uppercase tracked labels, formal trilingual states |
| Playfulness in content | HighlightLastWord, glass cards, gradient ribbons, dot textures, rounded shapes |

**When implementing new pages**: lean toward approachable and warm. Use the motifs documented above. Maintain generous spacing and large rounded shapes. Reserve the deeper red for chrome surfaces; use accents and gradients for content.
