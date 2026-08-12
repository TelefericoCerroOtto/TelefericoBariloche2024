import { i18n } from "@/i18n";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import { shouldRedirectMaintenanceDashboardSections } from "@/lib/maintenance-access";
import { redirect } from "next/navigation";

export default function DashboardSectionsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (
    shouldRedirectMaintenanceDashboardSections(
      process.env.MAINTENANCE_MODE === "true",
    )
  ) {
    redirect(`/${i18n.defaultLocale}${ADMIN_ROUTES.DASHBOARD}`);
  }

  return children;
}
