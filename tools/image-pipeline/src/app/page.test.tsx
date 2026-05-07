import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import Page from "./page";
import { STUDIO_LOCAL_ONLY_NOTICE } from "@/lib/studio/capabilities";

test("standalone page renders local authoring workspace affordances", () => {
  const html = renderToStaticMarkup(<Page />);

  expect(html).toMatch(/Estudio del pipeline de imágenes/);
  expect(html).toMatch(/Importar carpeta/);
  expect(html).toMatch(/Importar archivos/);
  expect(html).toMatch(/jobs\.json/);
});

test("standalone page explicitly excludes remote v1 flows", () => {
  const html = renderToStaticMarkup(<Page />);

  expect(html).toMatch(new RegExp(STUDIO_LOCAL_ONLY_NOTICE));
  expect(html).not.toMatch(/download-pages-images/i);
});
