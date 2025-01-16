import { Spacer } from "./_components";

export default function NewsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Spacer />
      {children}
    </>
  );
}
