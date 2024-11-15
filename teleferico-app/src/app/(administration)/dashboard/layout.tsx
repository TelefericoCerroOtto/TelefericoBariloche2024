import { SidebarProvider } from "@/components/Sidebar";
import Sidebar from "./_components/Sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <SidebarProvider>
        <Sidebar />
        <main>{children}</main>
      </SidebarProvider>
    </div>
  );
}
