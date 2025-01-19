import { Spacer } from "@nextui-org/react";

export default function NewsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Spacer y={28} />
      {children}
    </>
  );
}
