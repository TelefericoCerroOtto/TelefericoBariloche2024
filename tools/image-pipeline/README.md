# Image Pipeline (Sharp) — Crop + Fit to MP + Export por Aspect Ratio

Este tooling automatiza un flujo de **art direction** para imágenes:

1. **Crop** al aspect ratio objetivo (centrado o por `focalPoint`)
2. **Resize** a un target de **megapíxeles** (`mp`) sin excederlo
3. **Export** a WebP/JPEG con calidad controlada
4. Salida con naming: **`<nombreOriginal>-<AR>.<ext>`** (default) o **`<name>.<ext>`** si se define `outputs[].name`

> Pensado para proyectos Next.js + Tailwind + Strapi, donde se necesitan assets optimizados por ratio (desktop/mobile u otros), sin inflar tamaños y permitiendo que `next/image` funcione con `sizes` correctos.

---

## Objetivo

- Evitar subir imágenes “gigantes” con ratios incorrectos (ej: original 3:2 cuando el diseño pide 21:9 o 3:4).
- Garantizar que el ratio sea correcto **recortando**, no “apretando” con scale.
- Exportar en resoluciones razonables por **MP target**.
- Generar archivos listos para subir a Strapi, con nombre determinístico por ratio.

---

## Requisitos

- Node.js (recomendado LTS)
- pnpm (o npm/yarn, adaptando comandos)
- Dependencias principales: `sharp` (procesamiento de imágenes), `commander` (CLI), `tsx` + `typescript` (correr TypeScript sin build explícito)

---

## Instalación

Desde `tools/image-pipeline`:

```bash
pnpm install
```

---

## Uso rápido

1. Poner originales en `inbox/` (o la carpeta que definas en `jobs.json`).
2. Editar `jobs.json`.
3. Ejecutar:

```bash
pnpm img:process -- --jobs ./jobs.json
```

Dry-run (sin escribir archivos):

```bash
pnpm img:process -- --jobs ./jobs.json --dry-run
```

### Shared core with Studio

`tools/image-pipeline-studio` now reuses the exact same Sharp planning and render core from:

- `src/core/jobs.ts`
- `src/core/render.ts`

That means preview generation and batch execution both follow the same:

- EXIF orientation handling
- crop math
- megapixel fitting
- output name normalization
- collision policy semantics

`jobs.json` remains the canonical contract for both the CLI and Studio.

### Slot IDs and overwrite semantics

- Studio serializes each editable slot identifier into `outputs[].name`.
- Two slots may share the same technical settings and still stay distinct because the slot ID is what gets written to `jobs.json`.
- If `outputs[].name` resolves to an existing file, the configured `collisionPolicy` still applies exactly as in the CLI.
- Studio workspaces default to `collisionPolicy: "replace"` and `jobSubdir: false`, writing under each workspace `.studio/workspaces/<id>/processed` folder.
- That default avoids duplicate `-2`, `-3`, etc. files when you regenerate `jobs.json` after adding or editing workspace items and then process the workspace again.

---

## Conceptos clave del pipeline

### 1) Crop al ratio objetivo (art direction)

Se calcula el crop más grande posible que respete el ratio deseado:

- Imagen original: `W0 × H0`
- Ratio objetivo: `r = W/H`

Regla:

- Si `W0/H0 > r` → la imagen es “demasiado ancha” → se recorta **ancho**
- Si `W0/H0 < r` → la imagen es “demasiado alta” → se recorta **alto**

El rectángulo de recorte se posiciona:

- **Centrado** por default
- O alineado a un **`focalPoint`** (`x`, `y` normalizados 0..1)

### 2) Resize a MP objetivo (sin exceder)

Luego del crop (ratio correcto), se calcula una salida `out.w × out.h` tal que:

- `out.w * out.h <= mpTarget * 1_000_000`
- Lo más cercano posible al target
- Opcional: no superar el crop base (`capToBase: true`)
- Opcional: alinear a múltiplos (`alignTo`, default 2)

### 3) Export (WebP/JPEG)

Se exporta con calidad controlada (evitar `quality: 100`).

---

## Estructura del tooling

Ubicación recomendada:

```
/tools
  /image-pipeline
    package.json
    tsconfig.json
    jobs.json
    /src
      cli.ts
      processJobs.ts
      ratioToTag.ts
      sharpUtils.ts
      cropAndFitToMP.ts
```

---

## El archivo de configuración: `jobs.json`

Este es el **archivo principal** que vas a editar. Define qué imágenes se procesan, cómo se recortan y qué archivos se generan.

### 1) Estructura general

`jobs.json` puede tener **un solo job** o **varios jobs**.

Ejemplo de un solo job:

```json
{
  "name": "heroes",
  "inputDir": "./inbox",
  "outputDir": "./processed",
  "defaults": {
    "format": "webp",
    "quality": 82,
    "alignTo": 2,
    "capToBase": true,
    "outputs": [
      { "ratio": "16:9", "mp": 1.6 },
      { "ratio": "3:4", "mp": 1.2 }
    ]
  },
  "images": [
    { "file": "confiteria.jpg" },
    { "file": "hero-cerro-otto.jpeg" }
  ]
}
```

Ejemplo con varios jobs (como en este repo):

```json
{
  "jobs": [
    {
      "name": "confiteria",
      "inputDir": "./inbox/hero",
      "outputDir": "./processed/hero",
      "jobSubdir": true,
      "preserveFolders": true,
      "collisionPolicy": "suffix",
      "defaults": {
        "format": "webp",
        "quality": 82,
        "alignTo": 2,
        "capToBase": true,
        "outputs": [
          { "ratio": "16:9", "mp": 1.6 },
          { "ratio": "3:4", "mp": 1.2 }
        ]
      },
      "images": [
        { "file": "actividades.jpg" },
        { "file": "confiteria-otoño.jpg" }
      ]
    }
  ]
}
```

### 2) ¿De dónde se resuelven las rutas?

- `inputDir` y `outputDir` se resuelven **relativos a la ubicación de `jobs.json`**.
- Si `jobs.json` está en `tools/image-pipeline/`, entonces `./inbox` significa `tools/image-pipeline/inbox`.

---

## Campos del job (nivel principal)

- `name` (string, opcional): nombre del job. Se usa para crear subcarpeta si `jobSubdir` es `true`. Si falta, se usa `job`.
- `inputDir` (string, obligatorio): carpeta de entrada con originales.
- `outputDir` (string, opcional): carpeta base de salida. Default: `./processed`.
- `jobSubdir` (boolean, opcional): si `true`, crea una subcarpeta con el nombre del job dentro del `outputDir`. Default: `true`.
- `preserveFolders` (boolean, opcional): si `true`, preserva subcarpetas del `file` dentro del output. Default: `true`.
- `collisionPolicy` ("error" | "skip" | "suffix" | "replace", opcional): qué hacer si el archivo de salida ya existe. Default: `error`.
- `defaults` (objeto, opcional): valores por defecto para todos los outputs e imágenes.
- `images` (array, obligatorio): lista de imágenes a procesar.

---

## Campos de `defaults`

- `format` ("webp" | "jpeg", opcional): formato de salida. Default: `webp`.
- `quality` (number 1..100, opcional): calidad de compresión. Default: `82`.
- `alignTo` (number, opcional): alinea ancho/alto a múltiplos (2 es buen default). Default: `2`.
- `capToBase` (boolean, opcional): si `true`, **no agranda** la imagen más allá del crop. Default: `true`.
- `outputs` (array, opcional): outputs por defecto para todas las imágenes.

Importante:

- Si una imagen trae `outputs`, **reemplaza** a `defaults.outputs` (no se mezclan).
- Si no hay `outputs` en `defaults` ni en la imagen, el job **falla**.

---

## Campos de `images`

- `file` (string, obligatorio): nombre del archivo dentro de `inputDir`. Puede incluir subcarpetas, por ejemplo: `landing/confiteria.jpg`.
- `focalPoint` (objeto, opcional): punto de interés para centrar el crop.
- `outputs` (array, opcional): outputs específicos para esta imagen (sobrescribe `defaults.outputs`).

### `focalPoint`

- `x` va de 0 a 1 (0 = izquierda, 1 = derecha)
- `y` va de 0 a 1 (0 = arriba, 1 = abajo)

Si no se define, se usa el centro (`0.5, 0.5`).

---

## Campos de `outputs`

Cada output genera **un archivo** de salida.

- `name` (string, opcional): override del nombre del archivo de salida (sin extensión).
- `ratio` (string o number, obligatorio): ratio objetivo. Formatos válidos: `"16:9"`, `"3:4"`, `"21:9"` o `1.777` (ratio flotante).
- `mp` (number, obligatorio): megapíxeles objetivo (no exceder).
- `format` ("webp" | "jpeg", opcional): override por output.
- `quality` (number 1..100, opcional): override por output.

Reglas importantes:

- Si `name` está presente y no está vacío, el archivo de salida se llama **`<name>.<ext>`** (sin sufijos de ratio).
- Si `name` incluye extensión, se remueve y se loguea un warning.
- Si `name` está vacío o solo espacios, se ignora y se usa el naming default.
- Si dos outputs resuelven al **mismo nombre final**, aplica `collisionPolicy` (`replace`, `suffix`, `skip`, `error`).
- Si el `ratio` es un número, el tag del archivo queda como `r1_777` (punto reemplazado por `_`).

---

## Salida generada (archivos y carpetas)

### 1) Ruta base de salida

La carpeta base se define así:

- Si `outputDir` está definido, se usa eso. Si no, `./processed`.
- Si `jobSubdir` es `true`, se agrega una subcarpeta con el `name` del job.

Ejemplo:

- `outputDir`: `./processed`
- `name`: `heroes`
- `jobSubdir`: `true`

La salida base queda en:

```
./processed/heroes
```

### 2) Preservar subcarpetas del `file`

Si `preserveFolders` es `true` y el `file` tiene subcarpetas, se respetan.

Ejemplo:

- `file`: `landing/confiteria.jpg`
- `preserveFolders`: `true`

Salida:

```
./processed/heroes/landing/confiteria-16x9.webp
```

Si `preserveFolders` es `false`, el archivo se guarda directo en la carpeta base:

```
./processed/heroes/confiteria-16x9.webp
```

### 3) Nombre del archivo

Formato:

```
<nombreOriginal>-<ratioTag>.<ext>
```

- `nombreOriginal` = nombre del archivo sin extensión
- `ratioTag` = ratio convertido a tag (`16:9` → `16x9`, `1.777` → `r1_777`)
- `ext` = `webp` o `jpg` (si `format` es `jpeg` usa `.jpg`)

Ejemplo:

- Input: `confiteria.jpg`
- Output ratio: `16:9`
- Output format: `webp`

Salida:

```
confiteria-16x9.webp
```

---

## ¿Qué pasa si el archivo de salida ya existe?

Eso lo define `collisionPolicy`:

- `error`: aborta con error.
- `skip`: no genera el archivo.
- `replace`: sobrescribe el archivo existente con la salida nueva.
- `suffix`: agrega un sufijo `-2`, `-3`, etc. hasta encontrar un nombre libre.

En Studio, el default es `replace` porque el flujo normal re-ejecuta el `jobs.json` completo del workspace. Sobrescribir evita acumular duplicados innecesarios cuando solo agregaste una imagen nueva o ajustaste asignaciones/focal points.

Ejemplo con `suffix`:

```
confiteria-16x9.webp
confiteria-16x9-2.webp
confiteria-16x9-3.webp
```

---

## Notas importantes (para principiantes)

- Si un archivo de `inputDir` **no existe**, se muestra un warning y se saltea.
- Las dimensiones se calculan con orientación EXIF (fotos de celular no salen rotadas).
- Si `capToBase` es `true`, nunca se agranda una imagen.
- Si usás `ratio` con texto inválido, el output se saltea.

---

## Archivos y responsabilidades

### `src/cropAndFitToMP.ts`

**Matemática del pipeline** (puro cálculo):

- Parse del aspect ratio (`"21:9"` o número)
- Cálculo del `crop`
- Cálculo del `out` por MP target
- Devuelve: `crop`, `out`, `mpOut`, etc.

> Este archivo no depende de Sharp.

### `src/sharpUtils.ts`

**Compatibilidad con EXIF orientation**:

- Fotos de celulares suelen venir “rotadas” por metadata EXIF.
- Para que `crop.x/y` sea consistente, se calcula `base.w/h` en el “espacio ya rotado”.
- En el pipeline se usa `sharp(...).rotate()` antes de `extract()`.

### `src/ratioToTag.ts`

Convierte un ratio a una etiqueta para filename:

- `"16:9"` → `"16x9"`
- `"21:9"` → `"21x9"`
- `"3:4"` → `"3x4"`
- Si fuera float `"1.777"` → `"r1_777"`

### `src/processJobs.ts`

**Orquestador**:

Lee `jobs.json` y, para cada imagen y cada output, hace: metadata con Sharp, cálculo de `base` orientada, `cropAndFitToMP(...)`, y luego `sharp(...).rotate().extract().resize()` con export a `.webp(...)` o `.jpeg(...)`. Finalmente escribe el archivo con el naming por ratio.

### `src/cli.ts`

**CLI**:

- Recibe `--jobs <path>`
- Opción `--dry-run` para simular sin escribir archivos
- Llama a `processJobs(...)`

---

## Defaults recomendados de export

- WebP (fotos): 75–85
- WebP (con overlays/brightness): 70–78
- JPEG: 82–90

> Después `next/image` aplica su `quality` y genera variantes según `sizes`. La optimización grande se consigue con: ratio correcto + MP razonables + `sizes` bien declarados.

---

## Troubleshooting

### 1) “El crop sale mal en fotos de celular”

Suele ser EXIF orientation.
Este tooling:

- calcula `base.w/h` en espacio orientado
- aplica `.rotate()` antes de `.extract()`

Si igual ves inconsistencias, revisá que:

- El crop se calcule usando `base` orientado (sí)
- No haya otra rotación previa fuera del pipeline

### 2) “Sale muy chico vs mpTarget”

Puede pasar si:

- La imagen original/crop base es más chico que el target
- `capToBase: true` evita upscaling (intencional)

Soluciones:

- Subir un original de mayor resolución
- O setear `capToBase: false` (no recomendado salvo casos puntuales)

### 3) “Se pisan outputs”

Ocurre si repetís ratios:

- Dos outputs con `"16:9"` para la misma imagen

Solución:

- Asegurá ratios únicos por imagen
- O definí distintos formatos/ratios reales

---

## Extensiones futuras (si querés)

- `jobs.json` con `name` para override del stem (`"name": "confiteria-01"`)
- `skipIfExists` para no reprocesar
- `outputSubdir` por imagen (agrupar por página/colección)
- Soporte de `jpg + webp` simultáneo por output

---
