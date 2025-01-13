import { Footer, Navbar } from "./_components";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="leading-8">
      <Navbar />
      <main className="relative -top-[5rem] min-h-screen">{children}</main>
      <Footer />
    </div>
  );
}
