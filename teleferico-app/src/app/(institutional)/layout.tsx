import { PageWrapper } from "@/components";
import { Footer, Navbar } from "./_components";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="leading-8">
      <Navbar />
      <main className="relative -top-[5rem] min-h-screen">
        <PageWrapper>{children}</PageWrapper>
      </main>
      <Footer />
    </div>
  );
}
