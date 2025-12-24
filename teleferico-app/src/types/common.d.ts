import type { ErrorResponse } from "@/types";

export type FetchResponse<T> =
  | { ok: false; data: ErrorResponse }
  | { ok: true; data: T }
  | { ok: false; data: null };

/**
 * Permutation<T> genera, a nivel de tipos, TODAS las permutaciones posibles de una unión T.
 *
 * Ejemplo:
 *   type Status = "bien" | "mal" | "regular"
 *   type P = Permutation<Status>
 *   // P termina siendo un union de tuplas:
 *   // ["bien","mal","regular"] | ["bien","regular","mal"] | ["mal","bien","regular"] | ...
 *
 * ¿Qué garantiza?
 * - Cada tupla contiene TODOS los miembros de T exactamente una vez (sin repetidos).
 * - El orden puede variar (por eso son permutaciones).
 *
 * ¿Cómo funciona?
 * 1) Caso base:
 *    [T] extends [never] ? []
 *    Cuando ya no quedan elementos en T (T = never), la permutación “vacía” es [].
 *    Se usan corchetes [T] para evitar la “distribución” de los conditional types.
 *
 * 2) Paso recursivo (distributivo):
 *    K extends K ? [K, ...Permutation<Exclude<T, K>>] : never
 *    Este conditional ES distributivo porque K es un parámetro “desnudo” (K extends K).
 *    Entonces, si K = (A | B | C), TypeScript evalúa el branch para cada miembro:
 *      - Para K = A: [A, ...Permutation<Exclude<T, A>>]
 *      - Para K = B: [B, ...Permutation<Exclude<T, B>>]
 *      - Para K = C: [C, ...Permutation<Exclude<T, C>>]
 *
 * 3) Exclude<T, K> elimina el elemento elegido (K) de la unión T,
 *    evitando repeticiones y haciendo que la recursión termine.
 *
 * Resultado: una unión de tuplas que representa todas las maneras de ordenar T.
 */

export type Permutation<T, K = T> = [T] extends [never]
  ? []
  : K extends K
    ? [K, ...Permutation<Exclude<T, K>>]
    : never;
