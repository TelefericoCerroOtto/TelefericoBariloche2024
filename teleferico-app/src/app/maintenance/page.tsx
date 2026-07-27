import { MaintenanceContent } from './maintenance-content';

type SearchParams = Promise<{ locale?: string }>;

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const initialLocale = params.locale || 'es-AR';

  return <MaintenanceContent initialLocale={initialLocale} />;
}
