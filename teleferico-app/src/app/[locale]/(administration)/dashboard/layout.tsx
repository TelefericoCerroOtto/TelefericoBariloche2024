import { SidebarProvider } from "@/components/ui/Sidebar";
import { Header } from "./_components/Header";
import Sidebar from "./_components/Sidebar";
import SessionWatcher from "./_components/SessionWatcher";
import { auth } from "@/auth";
import { type Metadata } from "next";

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

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <SessionWatcher />
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
