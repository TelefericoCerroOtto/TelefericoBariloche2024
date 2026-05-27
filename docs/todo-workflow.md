# Flujo de TODOs compartidos

Este documento define cómo se capturan, triagean y promueven los TODOs del proyecto entre **Notion** y **GitHub**.

## Camino corto

1. Buscar en Notion si el trabajo ya existe.
2. Si existe, actualizar o fusionar el ítem en lugar de duplicarlo.
3. Si no existe, crear **una fila** en la base **Backlog unificado**.
4. Cuando el trabajo ya esté claro y necesite un artefacto formal, definir el `Canal formal` correcto.
5. Formalizar de manera explícita (agente o dispatch manual), adjuntar el enlace correspondiente y recién ahí mover a `Formalizado`.

## Fuente de verdad

### Antes del issue

La fuente de verdad es la base de Notion **Backlog unificado**.

Se usa para:

- capturar ideas o bugs detectados en conversaciones
- consolidar TODOs heredados
- hacer triage
- evitar duplicados
- decidir cuándo algo ya merece un issue formal

### Después de formalizar

La fuente formal de ejecución depende del `Canal formal`:

- `GitHub Issue` → issue + branch/PR/commit
- `Cambio operativo` → cambio ejecutado fuera del repo con evidencia o enlace asociado
- `Documento / ADR` → documento o decisión persistida
- `Otro` → artefacto externo justificado en notas

La fila de Notion no se borra: se mantiene como índice y contexto liviano.

## Esquema estándar de Notion

Cada ítem se representa como **una fila** con estas propiedades:

| Propiedad | Uso | Regla |
| --- | --- | --- |
| `Tarea` | título corto y accionable | una sola unidad de trabajo |
| `Estado` | estado operativo | usar solo valores permitidos |
| `Tipo` | clasificación | `Bug`, `Feature`, `Refactor`, `Content`, `Infra`, `Docs`, `Security` |
| `Área` | superficie afectada | una o más áreas relevantes |
| `Prioridad` | urgencia relativa | `P1`, `P2`, `P3` |
| `Fuente` | origen del ítem | `legacy-notion`, `TODO.md`, `chat`, `meeting` |
| `Contexto` | ruta, dominio o sección | ejemplo: `/faqs`, `teleferico-cms/auth`, `repo` |
| `Work ID` | identificador estable del backlog | autogenerado por Notion, por ejemplo `TB-066` |
| `Branch` | rama activa asociada al trabajo | opcional, se llena cuando exista una rama concreta |
| `Canal formal` | tipo de artefacto formal esperado | `GitHub Issue`, `Cambio operativo`, `Documento / ADR`, `No requiere`, `Otro` |
| `Enlace formal` | URL del artefacto formal | vacía hasta que exista el artefacto |
| `Notas` | subtareas, aceptación, dudas, merge notes | texto breve, sin convertir la fila en una mini-especificación gigante |

## Convención de ramas derivada del backlog

- `Work ID` es el identificador estable del trabajo. No cambia aunque la rama cambie.
- `Branch` guarda la rama concreta activa, si existe.
- La convención recomendada para ramas es:

```text
<type>/<dir>-<work-id>-<slug>
```

Ejemplos:

- `fix/app-tb-066-login-refresh`
- `chore/infra-tb-067-pause-legacy-vm`
- `feat/cms-tb-068-page-seo-fields`

Reglas:

- `type` sigue Conventional Commits (`feat`, `fix`, `chore`, `refactor`, etc.)
- `dir` sigue `docs/CONVENTIONS.md` (`app`, `cms`, `tools`, `root`, o compuestos si aplica)
- `work-id` debe venir del campo `Work ID`
- `slug` debe ser corto, descriptivo y en kebab-case
- La política completa de asociación entre backlog, ramas e implementation PRs vive en `docs/backlog-branch-pr-policy.md`.

## Estados permitidos

| Estado | Cuándo usarlo |
| --- | --- |
| `Inbox` | captura rápida sin triage mínimo |
| `Clarificar` | falta contexto, decisión, alcance o validación |
| `Listo para formalizar` | ya está claro y necesita algún artefacto formal |
| `Formalizado` | el artefacto formal ya existe y la fila tiene su enlace |
| `En progreso` | se está ejecutando activamente |
| `Bloqueado` | hay un impedimento externo o técnico |
| `Hecho` | resuelto de verdad |
| `No hacer` | descartado conscientemente |

## Reglas de captura y deduplicación

- No crear filas casi iguales con distinto wording.
- Buscar primero por palabras clave, área y contexto.
- Si el nuevo pedido es el mismo trabajo con más detalle, **enriquecer la fila existente**.
- Si el nuevo pedido es una variante menor o subtarea, agregarlo en `Notas` salvo que necesite seguimiento independiente.
- Si dos filas compiten por el mismo resultado, conservar una y marcar la otra como fusionada en `Notas` antes de pasarla a `No hacer` o dejarla como referencia.

## Criterio para elegir el canal formal

### `GitHub Issue`

Usarlo cuando:

- el trabajo necesita seguimiento formal de ingeniería
- probablemente implique código, review, PR o deploy
- conviene preservarlo como artefacto estable de ejecución

### `Cambio operativo`

Usarlo cuando:

- el trabajo principal ocurre fuera del repositorio
- el cambio vive en GCP, Notion, IAM, consola, DNS, Cloud Run, Cloud SQL u otra plataforma operativa
- hace falta trazabilidad, pero no necesariamente un issue de código

### `Documento / ADR`

Usarlo cuando:

- primero hace falta una definición o decisión explícita
- la salida esperada es una política, un diseño o una arquitectura acordada
- ese documento puede luego derivar en uno o más issues o cambios operativos

### `No requiere`

Usarlo cuando:

- la tarea es tan chica o local que no amerita artefacto formal adicional
- alcanza con resolverla y dejar trazabilidad mínima en Notion

## Criterio para pasar de Notion a GitHub Issue

Promover a GitHub cuando se cumplan **la mayoría** de estas condiciones:

- el problema o cambio ya está entendido
- existe una definición mínima de alcance
- el trabajo necesita seguimiento formal de ingeniería
- probablemente implique código, review, PR o deploy
- conviene preservarlo como artefacto estable fuera de una conversación

No promover todavía cuando:

- sigue siendo una idea vaga
- todavía falta confirmar si es bug real, decisión o request válida
- el pedido es mejor absorbido dentro de otro ítem ya existente

## Protocolo de promoción a issue

1. Confirmar que la fila esté en `Listo para formalizar`.
2. Confirmar que `Canal formal = GitHub Issue`.
3. Crear el GitHub Issue usando el contrato canónico de `docs/issue-context-contract.md`.
4. Pegar la URL del issue en `Enlace formal`.
5. Cambiar el `Estado` a `Formalizado`.
6. Si el issue agrupa varias notas previas, resumir ese merge en `Notas`.

### Ejecución explícita (sin cron)

La formalización a issue es **on-demand**:

- vía agente (cuando se decide promover esa fila)
- o vía `workflow_dispatch` del workflow `backlog-governance` en modo `reconcile-ready-items`

No hay promoción horaria automática desde Notion a GitHub.

### Estructura mínima requerida del issue

Todo issue promocionado desde Notion debe respetar la misma columna vertebral:

- `## Summary`
- `## Problem`
- `## Desired Outcome`
- `## Scope`
- `## Context`
- `## Repo Surfaces to Inspect`
- `## Acceptance Signals`
- `## Related Artifacts`

En `## Related Artifacts` incluir siempre:

- `Work ID`
- URL de Notion de la fila origen
- issues relacionados cuando existan
- PRs relacionados cuando existan (o `N/A`)

Si falta información, usar placeholders explícitos (`TBD`, `Unknown`, `N/A`) y no eliminar secciones requeridas.

## Protocolo para otros canales formales

1. Confirmar que la fila esté en `Listo para formalizar`.
2. Elegir el `Canal formal` correcto.
3. Crear o ejecutar el artefacto correspondiente.
4. Pegar la referencia en `Enlace formal` si aplica.
5. Cambiar el `Estado` a `Formalizado` cuando el artefacto ya exista.

## Reglas para agentes

Cuando un agente reciba una instrucción del tipo “agregá un TODO”, “triageá este backlog item” o “pasá esto a issue”, debe:

1. revisar el backlog de Notion antes de crear nada
2. detectar posibles duplicados
3. decidir si corresponde crear, actualizar, fusionar o dejar en clarificación
4. respetar los estados y propiedades de este documento
5. no escribir nuevos items en `TODO.md` ni en checklists legacy
6. no asumir que toda tarea clara termina en GitHub Issue; primero elegir el `Canal formal` correcto
7. si se crea o sugiere una rama, usar `Work ID` en el nombre y guardar la rama resultante en `Branch`
8. no disparar formalización por cron implícito: la promoción a artefacto formal se decide y ejecuta explícitamente

## Legado

- El antiguo `TODO.md` del repo quedó archivado y migrado a Notion.
- La página vieja `TO DO` de Notion quedó como puerta de entrada y referencia al backlog nuevo.
- El contenido previo quedó preservado en un archivo legacy dentro de Notion y en el historial de Git.
