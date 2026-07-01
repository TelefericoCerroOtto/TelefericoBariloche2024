# Proposal: Image Text Block Visibility

## Intent

Give editors a reversible way to temporarily hide an `ImageTextBlock` without deleting localized content. The first iteration is intentionally limited to `ImageTextBlock`, not every renderable page component.

## Scope

### In Scope
- Add an `isVisible` boolean to the Strapi `ImageTextBlock` component, defaulting new blocks to visible.
- Treat visibility as per-locale because the field lives inside localized page block content.
- Hide only when `isVisible === false`; missing or undefined values MUST still render.
- Add a centralized frontend renderer guard for `ImageTextBlock`.
- Confirm the new guard composes with the existing activities page active-activity filter.

### Out of Scope
- Global visibility for all renderable page components.
- Permission, workflow, preview, or publication lifecycle changes.
- Query-level filtering unless implementation proves the scalar field is not returned automatically.

## Capabilities

### New Capabilities
- `image-text-block-visibility`: Editorial visibility control for localized `ImageTextBlock` blocks, preserving backward-compatible rendering for existing content.

### Modified Capabilities
- None.

## Approach

Update the CMS schema, app type contract, and the existing `ImageTextBlock` renderer only. Keep visibility enforcement close to rendering so every institutional page gets the same rule while page-specific business filters remain separate.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `teleferico-cms/src/components/page-components/image-text-block.json` | Modified | Add `isVisible` boolean with `default: true`. |
| `teleferico-app/src/types/cms/components.d.ts` | Modified | Add optional `isVisible?: boolean` to the frontend CMS component contract. |
| `teleferico-app/src/components/shared/StrapiComponentRenderer/renderers/image-text-block.tsx` | Modified | Return `null` only for explicit `isVisible === false`. |
| `teleferico-app/src/app/[locale]/(institutional)/activities/page.tsx` | Checked | Ensure active-activity filtering still composes with renderer-level visibility. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CMS/app contract drift during rollout | Medium | Deploy CMS schema and app type/rendering changes as one coordinated change. |
| Existing content has no field value | High | Make the app type optional and render unless the value is explicitly `false`. |
| Stale page cache shows hidden blocks briefly | Medium | Rely on deploy/revalidation flow and document cache expectations during rollout. |
| Editors expect global block visibility | Low | Keep scope explicit; defer all-component visibility to a separate platform proposal. |

## Rollback Plan

Revert the CMS schema field, frontend optional type, and renderer guard in one rollback. Existing content remains safe because missing/ignored `isVisible` values render normally.

## Dependencies

- Coordinated `teleferico-cms` and `teleferico-app` release.
- Strapi Admin must expose the new component field after schema build/restart.

## Success Criteria

- [ ] New `ImageTextBlock` entries default to visible in Strapi.
- [ ] Existing blocks without `isVisible` continue rendering.
- [ ] Blocks with `isVisible === false` do not render on institutional pages.
- [ ] Activities page keeps hiding inactive activity-linked blocks independently.
