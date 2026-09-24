# Content Components Guide

Practical reference for creating and editing content on the Teleférico Cerro Otto website. Covers every renderable component type, its available fields, visual behavior, and content guidelines.

> **Audience**: content authors, AI assistants used for content drafting, and developers adding new content blocks.
>
> **Companion document**: [Cerro Otto Business Context](./cerro-otto-business-context.md) — read it first. Every piece of content must be consistent with the business rules, terminology, and operational constraints described there.

## Content Principles

### Voice and Register

The site speaks to **tourists and families considering a visit**. The register is **warm, inviting, and professional** — approachable without being informal, precise without being corporate.

| Do | Don't |
|---|---|
| Address the visitor directly and warmly | Use stiff institutional or legal language |
| Highlight the experience and what awaits them | List technical specifications or internal jargon |
| Be concise — one clear idea per sentence | Write long paragraphs or compound sentences |
| Use present tense and active voice | Use passive constructions or conditional hedging |

**Examples of register:**

- Good: "Ascendé en góndola y disfrutá de una vista panorámica de los lagos y la cordillera."
- Too formal: "El servicio de telecabinas permite el ascenso de pasajeros hacia la cumbre del Cerro Otto."
- Too informal: "¡Subite a la góndola y volá por los aires! Te vas a morir con la vista."

### The Over-Explanation Rule

**Do not over-explain.** State what is included, what is offered, what the visitor will experience. Do not list what is excluded, what is not available, or edge-case conditions — that creates confusion rather than clarity.

This is a foundational content principle. When in doubt, say less.

| Situation | Right approach | Wrong approach |
|---|---|---|
| A ticket includes gondola + summit access | "Incluye ascenso y descenso en góndola y acceso al complejo de la cumbre." | "Incluye ascenso y descenso en góndola y acceso al complejo de la cumbre. No incluye actividades pagas como tirolesa, palestra ni trineos. Tampoco incluye consumiciones en la Confitería Giratoria ni en el Patio de Comidas." |
| A seasonal activity is available | "Disponible en temporada invernal." | "Disponible en temporada invernal. No disponible en verano ni en otoño. Sujeto a condiciones climáticas y disponibilidad de personal." |
| A promotion with specific conditions | State the offer and its dates clearly | Add disclaimers, legal footnotes, or exhaustive condition lists |

### Content Restrictions

These constraints derive from business context. Violating them creates public confusion or legal exposure.

- **Schedules and prices are variable.** Never hardcode specific hours or prices in editorial content. Direct visitors to the pricing and schedules page or use language like "consultá horarios vigentes en nuestra web."
- **The foundation does not own the entire mountain.** Avoid language that implies ownership of trails, roads, or areas outside the property boundary.
- **Discontinued activities do not exist.** Never mention Otto Kart or any discontinued service, even in past tense or as "coming soon."
- **Weather conditions are unpredictable.** Do not promise guaranteed experiences that depend on weather (snow activities, outdoor terrace views, Piedra Habsburg hike).
- **Concessionaires are independent.** Gastronomy and shops at the summit are operated by independent businesses. Do not make promises about their specific offerings, menus, or prices.
- **Accessibility has conditions.** The CUD benefit has a mandatory companion requirement and restricted-service limitations. If mentioning accessibility, keep it simple and direct visitors to contact the company for details rather than explaining the full policy.
- **Ticket terms are strict.** Tickets are non-transferable and non-refundable. Avoid language that suggests flexibility around ticket usage.

## Translation Vocabulary

When content is translated to other languages (English, Portuguese, etc.), certain terms must be preserved literally. Do not translate them — they are proper nouns or brand terms.

This list will grow over time. Always check it before translating.

| Term | Rule | Reason |
|---|---|---|
| **Teleférico Cerro Otto** | Keep literal in all languages. Never translate "teleférico" to "cable car", "bondinho", "Seilbahn", or any equivalent. | Brand name. "Teleférico" is part of the proper noun, not a generic descriptor. |

## Editorial Components

These are the content blocks used to build pages. Each page is composed of an ordered list of blocks — the dynamic zone. Authors select which blocks to use and in what order.

### Hero

Full-bleed cover banner. Typically the first block on a page.

| Field | Required | Description |
|---|---|---|
| `title` | No | Main heading overlaid on the image |
| `description` | No | Supporting text below the title |
| `firstLink` | No | Primary CTA button (label + URL) |
| `secondLink` | No | Secondary CTA button (label + URL) |
| `align` | Yes | Text position: `bottom` or `center` |
| `desktopCover` | Yes | Cover image for desktop viewports |
| `mobileCover` | Yes | Cover image for mobile viewports |
| `logo` | No | Optional logo overlay |

**Content notes:**
- Title and description should be short — they compete with the background image for attention.
- Two separate images are required: one for desktop (landscape) and one for mobile (portrait). They can be different crops of the same photo.

**Example:**
> **title**: "Viví la cumbre del Cerro Otto"
> **description**: "Panorámicas de lagos, bosques y montañas a 1405 metros de altura."
> **firstLink**: "Planificá tu visita" → /es-AR/pricing-schedules
> **align**: bottom
> **desktopCover**: wide landscape of the summit terrace
> **mobileCover**: vertical crop of the same scene

---

### Title-Description Block

A text section with heading and rich body content. The workhorse for informational content without images.

| Field | Required | Description |
|---|---|---|
| `title` | Yes | Section heading |
| `desc` | Yes | Rich text body (supports formatting, links, lists) |
| `epigraph` | No | Short line above the title (kicker/category label) |
| `size` | Yes | Content width: `sm`, `md`, `lg`, or `full` |
| `align` | Yes | Text alignment: `center` or `start` (left) |
| `titleCase` | Yes | Title casing: `normal`, `capitalize`, `uppercase`, `lowercase` |
| `flexdir` | Yes | Layout direction: `col` (stacked) or `row` (side by side) |
| `bgColor` | Yes | Background: `none` (white) or `gray` (light gray band) |

**Content notes:**
- `epigraph` works as a category label or contextual kicker — e.g., "Gastronomía", "Actividades", "La experiencia". Keep it to 1–3 words.
- For `size`: use `sm` or `md` for reading-focused content, `lg` or `full` when the text needs room.
- `row` direction places title and description side by side — useful for intro sections where the title is prominent.

**Example:**
> **epigraph**: "Gastronomía"
> **title**: "Confitería Giratoria"
> **desc**: "Un restaurante único que gira 360° mientras disfrutás de la mejor vista de Bariloche. La plataforma completa una vuelta cada 20 minutos, ofreciendo un panorama continuo de lagos y montañas."
> **size**: md
> **align**: start
> **bgColor**: none

---

### Image-Text Block

The most versatile component. Combines images with text in 11 distinct visual layouts, grouped by image count.

#### Common fields (all variants)

| Field | Required | Description |
|---|---|---|
| `title` | Yes | Section heading |
| `description` | Yes | Rich text body |
| `epigraph` | No | Kicker/category line above title |
| `link` | No | CTA button (label + URL) |
| `imagesAmount` | Yes | `one`, `two`, or `three` — determines available variants |
| `isInverted` | No | Swaps image/text sides (default: image left, text right) |
| `isHighlighted` | No | Applies visual emphasis |
| `isVisible` | No | Hides block without deleting it (default: visible) |
| `bgColor` | Yes | Background: `none` or `gray` |
| `titleCase` | Yes | Title casing: `normal`, `uppercase`, `lowercase`, `capitalize` |

#### Image fields (per variant)

Each image requires:
- `image`: the media file
- `alt`: descriptive alt text (**always required** — accessibility enforced)

Desktop and mobile versions can be provided separately. If only one is provided, it is used for both viewports.

#### One-image variants

| Variant | Visual behavior | Best for |
|---|---|---|
| **single** | Image on one side, text on the other (50/50 split) | General content sections, descriptions of facilities or services |
| **poster** | Text overlaid on the image, full visual impact | Atmospheric, experience-focused sections |
| **card** | Bounded card layout within a container | Contained feature highlights |
| **panoramic** | Full-bleed background (21:9 desktop, 2:3 mobile) | Landscape photography, scenic impact sections |
| **spotlight** | Rounded card with decorative red accent ribbon | Highlighted features, special callouts |

#### Two-image variants

| Variant | Visual behavior | Best for |
|---|---|---|
| **double** | Two square images side by side in a rail, text beside them | Showing two aspects of the same topic (before/after, two views) |
| **cascade** | Two images stacked with offset (top larger, bottom smaller) | Layered visual narrative, complementary angles |

#### Three-image variants

| Variant | Visual behavior | Best for |
|---|---|---|
| **horizontal** | Three scrollable cards in a row | Showcasing a series (three activities, three views, three spaces) |
| **masonry** | Three-cell masonry grid | Photo-forward sections with varied compositions |
| **ladder** | Three offset frames in a stepped arrangement | Rhythmic, editorial feel |
| **miniatures** | One large main image + two thumbnails | One primary subject with supporting detail shots |

**Content notes:**
- Variant choice drives the visual tone. `panoramic` and `poster` are immersive; `single` and `card` are informational; `spotlight` draws attention.
- `isInverted` alternates the image/text side — use it to create visual rhythm when stacking multiple image-text blocks.
- When using `panoramic`, the text overlays the image — keep it short and high-contrast legible.

**Example (single variant):**
> **epigraph**: "La experiencia"
> **title**: "Ascenso en góndola panorámica"
> **description**: "Un recorrido de 12 minutos sobre el bosque patagónico en cabinas cerradas con vista panorámica. Desde la base hasta la cumbre, el paisaje se transforma a cada metro de altura."
> **link**: "Ver horarios" → /es-AR/pricing-schedules
> **imagesAmount**: one
> **variant**: single
> **image**: gondola cabin with forest and mountains in background
> **alt**: "Góndola del Teleférico Cerro Otto sobre el bosque con vista a los lagos"

**Example (panoramic variant):**
> **title**: "Terraza Panorámica"
> **description**: "El punto más alto del complejo. Vista abierta de 360° sobre el Lago Nahuel Huapi, la Isla Huemul y la Cordillera de los Andes."
> **imagesAmount**: one
> **variant**: panoramic
> **image**: wide landscape from the terrace
> **alt**: "Vista panorámica desde la terraza del Cerro Otto con el Lago Nahuel Huapi"

---

### Editorial Alert

Compact, reusable editorial message for short notices, promotions, warnings, or informational context. It is authored directly in the localized page dynamic zone and is independent of both `ImageTextBlock` and the fixed `PoliciesCallout` marker.

| Field | Required | Description |
|---|---|---|
| `title` | Yes | Short heading for the message |
| `description` | Yes | Rich text body; supports formatting and inline links |
| `variant` | Yes | Semantic intent: `default`, `promotion`, `warning`, or `info` |
| `epigraph` | No | Short contextual label above the heading |
| `link` | No | Optional CTA using the existing Link component (label + URL) |

**Content notes:**
- Keep the message concise; use this block for a focused editorial notice rather than a full informational section.
- Choose `variant` for meaning, not to customize appearance. The site derives icon and visual treatment from the variant; editors cannot set colors or icons.
- Editorial Alert renders as a low-profile horizontal banner inside the standard wide content container, with a compact semantic icon tile and tighter corners. On narrow screens its content and optional CTA stack without a fixed height; on wide screens the CTA aligns at the right. All variants use the same compact rounded CTA geometry and bold 14px label, with focus styling and colors selected by visual intent. `default` alone keeps the white surface. `warning` uses the approved Deep Red (`#9F1212`) wide-banner treatment with opaque white icon and rich text and a dark CTA with white text; it is an editorial visitor consideration, not live status or danger feedback. `promotion` uses the near-black Ink surface and the owner-approved component-scoped Evolution `hsl(0 88% 49%)` CTA/focus surface with white text. Its calculated contrast is about 4.56:1; the global `--primary` remains unchanged. `info` uses the owner-approved secondary/complementary brand blue (`#3B70CB`) surface with opaque white text and a dark CTA with a white label. It is distinct from operational status blue (`#0B4795`) and is app-controlled rather than a CMS color setting. Repository PR and staging validation are still pending; visual approval is not release verification.
- Add and translate the block independently in each required page locale because the page dynamic zone is localized.
- Unsafe CTA URL schemes are omitted by the app renderer. Inline rich-text links use the existing localized link renderer.
- This is editorial content, not a live service alert; it does not use live-alert accessibility semantics.

---

### Carrousel

A slider of rich content items. Each item is a full slide with its own image, text, and optional CTA.

| Field | Required | Description |
|---|---|---|
| `autoplayMs` | Yes | Auto-advance interval in milliseconds (0 = manual only) |
| `pauseOnHover` | Yes | Whether autoplay pauses on hover |
| `items` | Yes | 1 to 15 slides |

#### Per-item fields

| Field | Required | Description |
|---|---|---|
| `label` | No | Internal label (not shown to visitors — for CMS organization only) |
| `title` | No | Slide heading |
| `epigraph` | No | Kicker/category line |
| `description` | No | Rich text body |
| `link` | No | CTA button (label + URL) |
| `desktopCover` | Yes | Slide background image for desktop |
| `mobileCover` | Yes | Slide background image for mobile |

**Content notes:**
- Each slide is visually independent — it should make sense on its own since visitors may see them in any order.
- Keep text short per slide: a title + one or two sentences + CTA is the ideal density.
- `label` is for CMS housekeeping — name slides descriptively (e.g., "Slide Confitería", "Slide Tirolesa") so editors can find them.

**Example (3-slide carrousel):**
> **Slide 1:**
> label: "Slide Góndola"
> title: "Ascenso panorámico"
> description: "12 minutos de recorrido sobre el bosque con vista a lagos y montañas."
> link: "Conocé más" → /es-AR/excursion
>
> **Slide 2:**
> label: "Slide Confitería"
> epigraph: "Gastronomía"
> title: "Confitería Giratoria"
> description: "El único restaurante giratorio de la Patagonia."
>
> **Slide 3:**
> label: "Slide Actividades"
> title: "Aventura en la cumbre"
> description: "Tirolesa, palestra, trineos y caminatas guiadas."
> link: "Ver actividades" → /es-AR/activities

---

## News (Noticias)

News is a **separate content type**, not a page block. It has its own management section in Strapi and renders on the `/news` route.

| Field | Required | Description |
|---|---|---|
| `title` | Yes | News headline |
| `body` | Yes | Full article content (rich text) |
| `brief` | Yes | Short summary — displayed in the news listing as the preview excerpt |
| `date` | Yes | Publication date |
| `cover` | Yes | Cover image for the listing card and article header |
| `highlighted` | No | Pins the article as featured at the top of the listing |

**Content notes:**
- `brief` is what visitors see in the news grid before clicking. It should be self-contained: one or two sentences that convey the essence. Not a teaser — a summary.
- Apply the over-explanation rule strictly here. News about promotions or events should state what is offered and when. Nothing more.
- Date is the publication date, not the event date. If the news is about a future event, state the event date in the body.

**Example:**
> **title**: "Temporada invernal 2025"
> **brief**: "A partir del 1 de julio, el complejo de la cumbre incorpora actividades de nieve: trineos, caminata con raquetas y Circuito Otto invernal."
> **date**: 2025-06-20
> **cover**: summit with fresh snow
> **body**: [Rich text with details about the season opening, available activities, and a link to schedules]

---

## Functional Components

These blocks render operational data and require no editorial content. They are listed here for completeness.

| Component | What it renders | Content input |
|---|---|---|
| **FAQ Section** | Questions and answers from the FAQ collection | Managed in the FAQ section of Strapi — not inline. A `favs` toggle filters to featured entries only. |
| **Hours Overview** | Operating hours summary by area | Items with title, description, and icon — managed in Strapi. |
| **Policies Callout** | Localized pre-visit policies panel and CTA | Marker only. Copy comes from the global `ComponentTranslation` entry with key `policies-callout`; the destination is the fixed policies route. |
| **Schedules** | Schedules table | Populated from operational data (stations, sectors, service states). No editorial input. |
| **Service Status Button** | Live service status indicator | Fully automatic — reflects the current service state. |
| **Activity Showcase** | Highlights a specific activity | Links to an `activity` entry. The activity's own data populates the display. |
| **Spacer** | Vertical or horizontal whitespace | Spacing values only (`xSpace`, `ySpace`, range 0–96). |

### Policies Callout Marker

`PoliciesCallout` is a functional marker component with no editable properties. Add it at most once per page localization. Its presence and position in `Page.blocks` determine where the panel renders; its design, semantics, localized copy, and destination are application-owned.

- Add and order the marker independently in every required locale because `Page.blocks` is localized. This is a known Page model limitation, not a reason to duplicate copy in the marker.
- Place it after the first Image-Text Block following Hours Overview. If there is no later Image-Text Block, place it immediately after Hours Overview; if Hours Overview is absent, place it at the end.
- Maintain one localized `ComponentTranslation` record with key `policies-callout` and JSON fields `epigraph`, `title`, `description`, and `ctaLabel`.
- The CTA always navigates to the localized policies route. Editors cannot override its URL.
- The copy uses the dedicated `policies-callout` cache tag. Revalidate that tag after publishing or changing the translation.
- Missing, duplicate, failed, or malformed translation data is logged server-side and the panel is omitted. It never falls back silently to another locale or exposes a technical error to visitors.

---

## Image Requirements

All images across all components share these requirements:

- **Alt text is mandatory.** Every image must have a descriptive alt text for accessibility. Describe what is in the image, not what the section is about. Example: "Vista del Lago Nahuel Huapi desde la Terraza Panorámica del Cerro Otto" — not "Sección terraza".
- **Desktop and mobile versions.** When a component asks for both, provide appropriately cropped versions. Desktop images are landscape; mobile images are portrait or square.
- **Quality and relevance.** Images should be current, well-lit, and representative of the actual experience. Do not use stock photography or images from other locations.
