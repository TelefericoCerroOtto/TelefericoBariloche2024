## Exploration: image-text-block-visibility

### Current State
`ImageTextBlock` is a Strapi component used inside the localized `blocks` dynamic zone of pages. The CMS schema currently defines content/layout fields only (`title`, `description`, image variants, `isInverted`, `isHighlighted`) and the frontend `ImageTextBlock` type mirrors that contract. Institutional pages render these blocks through `BlocksRenderer` → `StrapiComponentRenderer` → `renderImageTextBlock` → `ImageTextRenderer`, while `activities/page.tsx` applies one extra filter to hide blocks linked to inactive activities. Because the page fetch does not restrict scalar component fields, a new boolean field would be returned automatically once the schema exists.

### Affected Areas
- `teleferico-cms/src/components/page-components/image-text-block.json` — add the new boolean in the source Strapi component schema.
- `teleferico-app/src/types/cms/components.d.ts` — extend the app contract with optional `isVisible` so old content remains valid.
- `teleferico-app/src/components/shared/StrapiComponentRenderer/renderers/image-text-block.tsx` — best central guard point to skip rendering only when `isVisible === false`.
- `teleferico-app/src/app/[locale]/(institutional)/activities/page.tsx` — confirm the existing activity-specific filter composes correctly with the new generic visibility rule.

### Approaches
1. **Renderer-level visibility guard** — add `isVisible` to the CMS/app contract and return `null` from the image-text renderer when the field is explicitly `false`.
   - Pros: One place covers all institutional pages; preserves existing content because `undefined` stays visible; minimal query churn.
   - Cons: Hidden blocks are still fetched from Strapi; activities page still carries its separate filter.
   - Effort: Low

2. **Page/query-level filtering** — add `isVisible` to the schema and filter blocks before they reach the renderer on each page/service path.
   - Pros: Rendering tree only receives visible blocks; page-specific flows can combine business filters early.
   - Cons: Easy to miss pages because `BlocksRenderer` is used broadly; duplicates logic across routes/services.
   - Effort: Medium

### Recommendation
Use **Renderer-level visibility guard**. It matches the existing centralized block-rendering architecture, keeps the contract backward compatible by treating missing `isVisible` as visible, and avoids scattering the same condition across every institutional page. `activities/page.tsx` should keep its activity-state filter, but the final hide rule should still be `block.isVisible === false`.

### Risks
- Strapi component schema changes are cross-package contract changes, so app and CMS deploys must stay coordinated.
- Existing page caches may continue serving stale rendered blocks until the relevant page tags are revalidated or a new deploy occurs.
- Because `blocks` are localized, editors may need to toggle visibility per locale if the same page is translated.

### Ready for Proposal
Yes — the scope is clear: one Strapi component field plus one frontend contract/update point, with backward-compatible default visibility and no permission-model change.

## Addendum: All-renderable-components scope

### Verified Renderable Component Surface
The localized `page.blocks` dynamic zone currently allows these 10 renderable page components, and the frontend renderer registry covers the same 10 keys:

- `page-components.image-text-block` — `teleferico-cms/src/components/page-components/image-text-block.json`
- `page-components.hero` — `teleferico-cms/src/components/page-components/hero.json`
- `page-components.hours-overview` — `teleferico-cms/src/components/page-components/hours-overview.json`
- `page-components.title-desc-block` — `teleferico-cms/src/components/page-components/title-desc-block.json`
- `page-components.faq-section` — `teleferico-cms/src/components/page-components/faq-section.json`
- `page-components.spacer` — `teleferico-cms/src/components/page-components/spacer.json`
- `page-components.schedules` — `teleferico-cms/src/components/page-components/schedules.json`
- `page-components.service-status-button` — `teleferico-cms/src/components/page-components/service-status-button.json`
- `page-components.carrousel` — `teleferico-cms/src/components/page-components/carrousel.json`
- `page-components.activity-showcase` — `teleferico-cms/src/components/page-components/activity-showcase.json`

### Scope Comparison
1. **Scope A — ImageTextBlock only**
   - Pros: Smallest CMS contract change; directly solves the known editorial need; lowest coordination cost across app + CMS.
   - Cons: Other block types would still need ad hoc solutions later if editors ask for per-locale hiding elsewhere.
   - Effort: Low.

2. **Scope B — Add `isVisible` to all renderable page components**
   - Pros: Consistent editorial rule across the whole dynamic zone; future block-level hiding becomes a standard capability instead of a one-off.
   - Cons: Much higher schema churn in Strapi (10 component schemas instead of 1); frontend types must be updated across the full `RendereableBlocks` union; rollout is broader than the current validated need.
   - Effort: Medium.

### Incremental Cost and Value Estimate
- **Frontend cost is not the main problem.** Because every page block passes through `BlocksRenderer` → `StrapiComponentRenderer` → `registry.ts`, scope B can use one centralized guard (`block.isVisible === false ? null : ...`) as long as all renderable block types share an optional `isVisible?: boolean` field. That keeps the `undefined MUST render` rule in one place.
- **CMS cost is the main problem.** Scope B requires touching all 10 Strapi component schemas, not just `image-text-block.json`. The changes are repetitive but sensitive because they alter the CMS→app contract for every renderable page component.
- **Net estimate:** moving from scope A to scope B is roughly **+9 extra CMS schema edits and +9 extra type additions**, while the frontend runtime logic can still stay near-constant if centralized.

### Recommendation Update
Stay with **Scope A (ImageTextBlock only)** unless product already knows that editors need per-locale visibility on multiple block families. If a broader capability is desired, implement it as a deliberate platform rule for all renderable page components with a centralized frontend guard — but that should be justified as a product-wide editorial feature, not just as a convenience extension of the current request.

### Additional Risks
- Scope B increases coordination risk because any missed schema/type pair would make the “global block visibility” rule inconsistent across components.
- Components like `hero`, `schedules`, and `service-status-button` are structurally simple, so adding `isVisible` there is technically easy but may add CMS UI noise without clear editorial value.
