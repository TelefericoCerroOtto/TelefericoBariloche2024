/**
 * Enables CSS side-effect imports when `noUncheckedSideEffectImports` is on.
 * Scope is intentionally limited to `.css` files (local app styles + vendor CSS).
 */
declare module "*.css";
declare module "swiper/css";
declare module "swiper/css/*";
