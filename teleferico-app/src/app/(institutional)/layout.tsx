import { PageWrapper } from "@/components";
import { Footer, Navbar } from "./_components";
import { SWRConfig } from "swr";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        refreshWhenOffline: false,
        focusThrottleInterval: 6000,
      }}
    >
      <div className="leading-8">
        <Navbar />
        <main className="relative -top-[5rem] min-h-screen">
          <PageWrapper>{children}</PageWrapper>
        </main>
        <Footer />
      </div>
    </SWRConfig>
  );
}
