# Design: Image Text Block Visibility

## Technical Approach

Add `isVisible` only to the Strapi `ImageTextBlock` component schema, mirror it as an optional frontend field, and enforce visibility in the existing `renderImageTextBlock` renderer. This keeps the rule centralized for all institutional pages using `BlocksRenderer` while preserving page-level filters such as the activities active-state filter. The contract follows the spec: missing, undefined, or `true` renders; only `isVisible === false` hides.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Renderer-level guard in `renderImageTextBlock` | Central for all app pages; does not prevent Strapi fetching hidden blocks. | Chosen because scope is presentation visibility, not query authorization or content lifecycle. |
| Query-level filtering in `getPageContent` | Could reduce payload, but risks breaking locale/content composition and legacy missing fields. | Rejected unless verification proves Strapi omits the scalar field; no filtering should be added. |
| Optional frontend type | Models legacy content accurately; callers must use strict false checks. | Chosen so existing blocks without the field remain visible. |
| All-renderable-component visibility | More reusable, but expands schema/type/renderer surface. | Rejected for this iteration per approved scope. |

## Data Flow

```text
Strapi localized Page.blocks
  -> getPageContent(locale, route)
  -> page-specific filters, e.g. activities active-state filter
  -> BlocksRenderer
  -> StrapiComponentRenderer registry
  -> renderImageTextBlock: isVisible === false ? null : ImageTextRenderer
```

Visibility is per locale because `getPageContent` requests one locale and receives localized block data. No permission or publication workflow changes are introduced.

## File Changes

| File | Action | Description |
|---|---|---|
| `teleferico-cms/src/components/page-components/image-text-block.json` | Modify | Add boolean `isVisible` with `default: true` to default new blocks to visible in Strapi Admin. |
| `teleferico-app/src/types/cms/components.d.ts` | Modify | Add `isVisible?: boolean` to `ImageTextBlock`; do not edit generated Strapi types. |
| `teleferico-app/src/components/shared/StrapiComponentRenderer/renderers/image-text-block.tsx` | Modify | Return `null` only when `block.isVisible === false`; otherwise render `ImageTextRenderer`. |
| `teleferico-app/src/lib/services/cms/collections/pages.ts` | Check | Verify the `ImageTextBlock` scalar field is returned by the current dynamic-zone populate. Adjust populate only if verification proves it is missing. |
| `teleferico-app/src/app/[locale]/(institutional)/activities/page.tsx` | Check | Keep the active-activity filter unchanged; visibility remains renderer-level after filtering. |
| `teleferico-app/src/components/shared/StrapiComponentRenderer/renderers/__tests__/image-text-block.test.tsx` | Create | Cover explicit false, true, and missing `isVisible` renderer behavior. |

## Interfaces / Contracts

```ts
export type ImageTextBlock = {
  __component: "page-components.image-text-block";
  id: number;
  isVisible?: boolean;
  // existing fields unchanged
} & Variants;
```

Renderer contract:

```ts
if (block.isVisible === false) return null;
return <ImageTextRenderer block={block} />;
```

CMS contract: `isVisible` is a Strapi component boolean with `default: true`. Existing records may omit it and must continue rendering.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `renderImageTextBlock` hides only explicit false. | Add Vitest cases for `false`, `true`, and omitted values using the existing app test runner. |
| Integration | Renderer guard composes with `BlocksRenderer` and activities filtering. | Verify existing activities filtering remains unchanged; add focused integration only if implementation extracts or exposes a testable seam. |
| E2E | Editor toggles localized visibility in Strapi Admin. | No automated E2E available; document manual staging check for visible and hidden locales. |

Run `pnpm --dir teleferico-app run test` and `pnpm --dir teleferico-app run typecheck`. CMS has no automated test/typecheck script; validate schema by building or starting Strapi during verification.

## Migration / Rollout

No data migration required. Roll out CMS schema and app changes together. Existing blocks without `isVisible` remain visible by design. Stale page cache may briefly show previous output until the existing revalidation/deploy flow refreshes cached pages.

## Open Questions

None.
