export const VERSION_GRACE_SECONDS = 1_800;

export type VersionEligibilityInput = {
  readonly sessionVersionKey: unknown;
  readonly activeVersionKey: unknown;
  readonly nowEpochSeconds: unknown;
  readonly versions: unknown;
};

type VersionLifecycle = {
  readonly versionKey: string;
  readonly status: "draft" | "published";
  readonly lastSupersededAtEpochSeconds: number | null;
};

type VersionEligibilityResult =
  | {
      readonly ok: true;
      readonly value: {
        readonly disposition: "current" | "superseded-grace";
      };
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly status: 410;
        readonly code: "SURVEY_UNAVAILABLE" | "SESSION_EXPIRED";
      };
    };

function unavailable(): VersionEligibilityResult {
  return {
    ok: false,
    error: { status: 410, code: "SURVEY_UNAVAILABLE" },
  };
}

function expired(): VersionEligibilityResult {
  return {
    ok: false,
    error: { status: 410, code: "SESSION_EXPIRED" },
  };
}

function isEpochSeconds(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function parseVersions(value: unknown): readonly VersionLifecycle[] | null {
  if (!Array.isArray(value)) return null;

  const versions: VersionLifecycle[] = [];
  const versionKeys = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
      return null;
    }

    const record = candidate as Record<string, unknown>;
    if (
      typeof record.versionKey !== "string" ||
      record.versionKey.length === 0 ||
      (record.status !== "draft" && record.status !== "published") ||
      (record.lastSupersededAtEpochSeconds !== null &&
        !isEpochSeconds(record.lastSupersededAtEpochSeconds)) ||
      versionKeys.has(record.versionKey)
    ) {
      return null;
    }

    versionKeys.add(record.versionKey);
    versions.push({
      versionKey: record.versionKey,
      status: record.status,
      lastSupersededAtEpochSeconds: record.lastSupersededAtEpochSeconds,
    });
  }

  return versions;
}

export function evaluateVersionEligibility(
  input: VersionEligibilityInput,
): VersionEligibilityResult {
  if (
    typeof input.sessionVersionKey !== "string" ||
    input.sessionVersionKey.length === 0 ||
    typeof input.activeVersionKey !== "string" ||
    input.activeVersionKey.length === 0 ||
    !isEpochSeconds(input.nowEpochSeconds)
  ) {
    return unavailable();
  }

  const versions = parseVersions(input.versions);
  if (!versions) return unavailable();

  const currentVersion = versions.find(
    (version) => version.versionKey === input.activeVersionKey,
  );
  const sessionVersion = versions.find(
    (version) => version.versionKey === input.sessionVersionKey,
  );

  if (
    currentVersion?.status !== "published" ||
    sessionVersion?.status !== "published"
  ) {
    return unavailable();
  }

  const supersededAt = sessionVersion.lastSupersededAtEpochSeconds;
  if (supersededAt !== null && supersededAt > input.nowEpochSeconds) {
    return unavailable();
  }

  if (sessionVersion.versionKey === currentVersion.versionKey) {
    return { ok: true, value: { disposition: "current" } };
  }

  if (supersededAt === null) return unavailable();

  if (input.nowEpochSeconds - supersededAt > VERSION_GRACE_SECONDS) {
    return expired();
  }

  return { ok: true, value: { disposition: "superseded-grace" } };
}
