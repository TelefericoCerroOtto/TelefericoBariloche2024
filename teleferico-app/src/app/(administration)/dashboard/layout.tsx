import { SidebarProvider } from "@/components/ui/Sidebar";
import { Header } from "./_components/Header";
import Sidebar from "./_components/Sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <Sidebar />
      <main className="w-full max-w-full">
        <Header />
        {/* TODO: resolver diferencia con el height del header.
          tailwind no acepta clases de manera dinamica 
          https://stackoverflow.com/questions/71791472/fontawesome-icons-not-accepting-color-props-through-react-functional-components/
          */}
        <div className={`h-[calc(100%-75px)] w-full max-w-full bg-accent pt-5`}>
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
