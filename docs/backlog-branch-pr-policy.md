# Política de backlog, ramas e implementation PRs

Este documento define cómo se asocian los ítems de Notion con ramas e implementation PRs para evitar relaciones implícitas o dependientes de memoria humana.

## Camino corto

1. El trabajo nace o se consolida en Notion.
2. Si va a tocar código o docs versionadas, puede tener rama asociada.
3. La rama debe incluir el `Work ID` del ítem primario.
4. Una implementation PR solo se crea o regenera si la asociación con el backlog es confiable.

## Modelo conceptual

- **Notion** guarda la unidad de trabajo y su madurez.
- **`Work ID`** es el identificador estable de esa unidad.
- **`Branch`** es opcional y representa una rama activa concreta.
- **Implementation PR** es la revisión del cambio real.
- **Promotion PR** mueve cambios ya revisados entre ramas/entornos y no crea una unidad nueva de backlog.

## Reglas base

### 1. `Work ID` es obligatorio para ramas gobernadas por este flujo

Si una rama se usa para implementar una unidad de trabajo del backlog, debe incluir el `Work ID` en el nombre.

Formato recomendado:

```text
<type>/<dir>-<work-id>-<slug>
```

Ejemplos:

- `fix/app-tb-066-login-refresh`
- `chore/infra-tb-067-pause-legacy-vm`
- `docs/root-tb-073-backlog-governance`

### 2. `Branch` es opcional

No todos los ítems deben tener rama. Es normal dejar `Branch` vacío cuando el trabajo:

- es puramente operativo en GCP
- todavía está en decisión/ADR
- vive en Notion o en otra herramienta sin cambios versionados

### 3. Una rama tiene un ítem primario

Por defecto, una rama debe mapear a **un ítem primario** del backlog.

Se toleran varios ítems en una misma rama solo si:

- son muy chicos
- están fuertemente acoplados
- y forman un solo outcome reviewable

Si no se cumple eso, hay que partir el trabajo.

## Política para implementation PRs

La política estricta aplica solo a **implementation PRs**.

### Asociación confiable requerida

Una implementation PR se puede crear o regenerar solo si se cumple al menos una:

1. la rama actual incluye el `Work ID`
2. el campo `Branch` del ítem coincide exactamente con la rama actual
3. el usuario pasa un override explícito indicando el ítem correcto

Si no se cumple ninguna, el flujo debe **frenar**.

### Qué hacer si la rama no sigue el estándar

Si la rama no contiene `Work ID` y no existe una asociación confiable por `Branch` u override:

- no crear ni regenerar la implementation PR
- pedir corrección de la rama o vinculación explícita con el backlog

### Ítems en `Clarificar`

Si el ítem sigue en `Clarificar`:

- se puede sugerir un nombre de rama
- no se debería crear una implementation PR automáticamente, salvo override explícito del usuario

### `Canal formal` y PRs

- Si `Canal formal = GitHub Issue`, la PR debe intentar usar la referencia formal del issue.
- Si `Canal formal != GitHub Issue`, la PR no debe inventar un issue por defecto.
- Un `Documento / ADR` puede igualmente vivir en una PR de docs. Lo importante es no forzar una semántica de issue cuando no corresponde.

## Política para promotion PRs

Las promotion PRs quedan fuera de la asociación estricta branch↔`Work ID`.

Motivo:

- su unidad de revisión es la **promoción del cambio ya aprobado**
- no representan un trabajo nuevo del backlog

Por lo tanto:

- no necesitan `Work ID` en la rama
- no necesitan un `Branch` de Notion asociado
- deben apoyarse en PRs/issues ya existentes y en la narrativa de release/promoción

## Política para la skill de sugerencia de ramas

La skill de ramas debe soportar dos modos:

### A. Desde working tree

Usa `git status` y `git diff` para inferir tipo, dir y slug.

### B. Desde ítem de Notion

Debe poder sugerir una rama aunque no haya cambios locales, usando:

- `Work ID`
- `Tipo`
- `Área`
- `Tarea`

Eso permite abrir la rama antes de tocar código.

## Edge cases

### Más de una rama para un mismo ítem

Permitido cuando un mismo trabajo se divide en slices revisables, pero el ítem principal sigue siendo uno.

Recomendación:

- dejar la rama principal en `Branch`
- documentar ramas adicionales en `Notas`
- si los slices ya son autónomos, crear ítems nuevos

### La rama existe antes que el ítem

No asumir match por similitud textual.

Opciones válidas:

- crear el ítem y vincularlo
- completar `Branch` en el ítem correcto
- pasar override explícito al flujo que crea PR

### El `Work ID` de la rama no existe en Notion

El flujo debe bloquearse. Una rama no puede apuntar a una unidad inexistente de la fuente de verdad.

### El `Branch` del ítem ya está ocupado por otra rama

No sobreescribir silenciosamente. Hay que pedir confirmación para:

- mover la asociación
- crear una rama nueva derivada
- o usar otro ítem

## Recomendación de enforcement futuro

Cuando exista el wrapper local de PR:

- **implementation PRs** → fail closed si falta asociación confiable
- **promotion PRs** → no aplicar esta validación estricta
- si falta contexto mínimo, pedir corrección antes de crear/regenerar la PR
