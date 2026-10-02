export type Tb113ReportGenerationProfile = Readonly<{
  profileVersion: 'feedback-report-generation-profile.v1';
  generation: Readonly<Record<string, unknown>>;
}>;

export function loadTb113ReportGenerationProfile(
  injectedProfile?: unknown,
): Tb113ReportGenerationProfile;
