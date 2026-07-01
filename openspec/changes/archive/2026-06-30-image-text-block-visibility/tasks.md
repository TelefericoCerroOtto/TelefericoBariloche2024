# Tasks: Image Text Block Visibility

## Phase 1: CMS schema and app contract

- [x] 1.1 Update `teleferico-cms/src/components/page-components/image-text-block.json` with `isVisible` boolean, `default: true`, and unchanged localization settings.
- [x] 1.2 Add `isVisible?: boolean` to `ImageTextBlock` in `teleferico-app/src/types/cms/components.d.ts`; keep legacy content valid when the field is absent.
- [x] 1.3 Inspect `teleferico-app/src/lib/services/cms/collections/pages.ts`; only expand the populate for localized `ImageTextBlock` if the scalar field is not already returned.

## Phase 2: RED tests for visibility behavior

- [x] 2.1 Add `teleferico-app/src/components/shared/StrapiComponentRenderer/renderers/__tests__/image-text-block.test.tsx` covering `isVisible` missing, `true`, and explicit `false`.
- [x] 2.2 Add or adjust a focused test around `teleferico-app/src/app/[locale]/(institutional)/activities/page.tsx` to confirm active-activity filtering still happens independently of block visibility.

## Phase 3: Implement the renderer guard

- [x] 3.1 Update `teleferico-app/src/components/shared/StrapiComponentRenderer/renderers/image-text-block.tsx` to return `null` only when `block.isVisible === false`.
- [x] 3.2 If Phase 1 proves `pages.ts` drops the scalar, add the minimal populate fix there; otherwise leave the page query unchanged.
- [x] 3.3 Verify the activities page composition stays filter-first, render-second, and does not add any global visibility handling.

## Phase 4: Verify and clean up

- [x] 4.1 Run `pnpm --dir teleferico-app run test` and `pnpm --dir teleferico-app run typecheck`.
- [x] 4.2 Run `npm --prefix teleferico-cms run build` to confirm the Strapi component schema is valid.
- [x] 4.3 Remove any temporary debugging code; keep comments only if they explain the strict-false visibility contract.

## Phase 5: Verification remediation

- [x] 5.1 Add `teleferico-app/src/lib/services/cms/collections/__tests__/pages.visibility.test.ts` around `teleferico-app/src/lib/services/cms/collections/pages.ts` to prove new localized `ImageTextBlock` content defaults to `isVisible: true`.
- [x] 5.2 Extend that test file to prove persisted `isVisible: false` survives page fetch/runtime shaping and still reaches the renderer as hidden.
- [x] 5.3 Add locale-isolation coverage in the same test file for locale A visible / locale B hidden, plus a locale A update that leaves locale B unchanged.
