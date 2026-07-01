# Image Text Block Visibility Specification

## Purpose

This specification defines reversible visibility for `ImageTextBlock` only. It preserves existing localized content, keeps visibility scoped to each locale, and does not introduce a global visibility system for other renderable components.

## Requirements

### Requirement: New ImageTextBlock entries default to visible

The system MUST persist `isVisible` as `true` for newly created `ImageTextBlock` entries unless an editor explicitly sets it otherwise.

#### Scenario: Create a block without choosing visibility

- GIVEN an editor creates a new `ImageTextBlock`
- WHEN the block is saved without an `isVisible` value
- THEN the stored block MUST be visible by default

#### Scenario: Create a block hidden on purpose

- GIVEN an editor creates a new `ImageTextBlock`
- WHEN the editor sets `isVisible` to `false`
- THEN the stored block MUST remain hidden

### Requirement: Visibility is evaluated per locale

The system MUST treat `isVisible` as localized content and evaluate it independently for each locale.

#### Scenario: One locale is visible and another is hidden

- GIVEN the same `ImageTextBlock` has `isVisible=true` in one locale and `isVisible=false` in another
- WHEN each locale is rendered
- THEN the visible locale MUST render the block
- AND the hidden locale MUST not render the block

#### Scenario: Updating one locale does not alter another

- GIVEN a block is visible in locale A and hidden in locale B
- WHEN an editor changes visibility in locale A only
- THEN locale B MUST keep its previous visibility state

### Requirement: Rendering hides only explicit false

The system MUST render `ImageTextBlock` when `isVisible` is missing, undefined, or `true`, and MUST hide it only when `isVisible === false`.

#### Scenario: Legacy content without the field still renders

- GIVEN existing localized content with no `isVisible` value
- WHEN the page is rendered
- THEN the block MUST render

#### Scenario: Explicit false hides the block

- GIVEN a localized `ImageTextBlock` with `isVisible === false`
- WHEN the page is rendered
- THEN the block MUST not render

### Requirement: Renderer visibility MUST compose with page-level filtering

The system MUST apply `ImageTextBlock` visibility independently from page-level business filters so existing page filters remain unchanged.

#### Scenario: Active activity keeps its block visibility behavior

- GIVEN an activities page includes an active activity and its `ImageTextBlock`
- WHEN the page is rendered
- THEN the activity filter MUST still decide whether the activity appears
- AND the block visibility rule MUST decide whether the block renders

#### Scenario: Hidden block does not affect active activity selection

- GIVEN an active activity contains an `ImageTextBlock` with `isVisible === false`
- WHEN the page is rendered
- THEN the activity MUST still be evaluated by the existing activity filter
- AND the block MUST remain hidden
