import { SidebarProvider } from "@/components/ui/Sidebar";
import { Header } from "./_components/Header";
import Sidebar from "./_components/Sidebar";
import SessionWatcher from "./_components/SessionWatcher";
import { getDashboardShellProjection } from "./_components/dashboard-shell-projection";
import { auth } from "@/auth";
import { isFeedbackCapabilityEnabled } from "@/lib/feedback/capability-gate";
import {
  ADMIN_LOGIN_REASONS,
  getAdminLoginUrl,
} from "@/lib/constants/routes.const";
import { type Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  const csrfToken = session?.csrfToken;

  return {
    other: csrfToken
      ? {
          // Esto produce: <meta name="csrf-token" content="...">
          "csrf-token": csrfToken,
        }
      : {},
  };
}

// Defense-in-depth: enforce auth at the dashboard layout boundary so all
// dashboard pages fail closed even if middleware is bypassed (e.g. via a
// dotted path that slips through the matcher, or a future matcher
// misconfiguration). Login/logout pages are siblings of dashboard — not
// children — so they are NOT affected by this guard.
export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session) {
    redirect(getAdminLoginUrl(ADMIN_LOGIN_REASONS.SESSION_EXPIRED));
  }

  const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true";
  const projection = getDashboardShellProjection({
    currentRole: session.user.role.name,
    isMaintenanceMode,
    isFeedbackEnabled: isFeedbackCapabilityEnabled(),
  });

  return (
    <SidebarProvider>
      {projection.showSessionWatcher ? <SessionWatcher /> : null}
      <Sidebar projection={projection} />
      <main className="w-full min-w-0 max-w-full overflow-x-hidden">
        <Header
          user={session.user}
          showProfile={projection.showProfile}
          showServiceStateControl={projection.showServiceStateControl}
        />
        {/* TODO: resolver diferencia con el height del header.
          tailwind no acepta clases de manera dinamica 
          https://stackoverflow.com/questions/71791472/fontawesome-icons-not-accepting-color-props-through-react-functional-components/
          */}
        <div className="h-[calc(100%-75px)] w-full min-w-0 max-w-full overflow-x-hidden bg-accent pt-5">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
