import { Footer, Navbar } from "./_components";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <Navbar />
      <main className="flex min-h-screen flex-col justify-between">
        {children}
      </main>
      <Footer />
    </div>
  );
}
