import { SidebarProvider } from "@/components/Sidebar";
import Sidebar from "./_components/Sidebar";
import { Header } from "./_components/Header";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <SidebarProvider>
        <Sidebar />
        <main className="w-full">
          <Header />
          {children}
        </main>
      </SidebarProvider>
    </div>
  );
}
