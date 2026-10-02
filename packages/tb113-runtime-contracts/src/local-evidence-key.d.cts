export function deriveLocalEvidenceKey(input: {
  readonly evidenceKeyId: string;
  readonly sourceRevision: string;
  readonly secretVersion: string;
}): Uint8Array;
