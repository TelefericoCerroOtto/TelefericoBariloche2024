# Institutional news UI notes

- `Card` now accepts optional `date` and `highlighted` props. They are backwards compatible (`undefined` keeps the previous behaviour) and provide formatted metadata and the badge for highlighted stories.
- `blocksToExcerpt` converts Strapi rich text to plain strings for compact summaries without loading the client renderer.
- Keyboard and screen reader support:
  - Featured and listing sections are rendered as `<section>` + `<article>` landmarks.
  - Cards expose accessible names via their titles and use `time` elements for dates.
  - Loading states announce themselves with `role="status"` and `aria-busy`.
- Motion is handled with `motion-safe:*` utility classes. To tweak or disable animations, adjust the `motion-safe:`/`motion-reduce:` segments in each component.
- The featured block shows a subtle `logo-recortado.svg` watermark (`LogoRecortado`). Remove or replace it by editing the decorative `<Image>` inside the featured article.
