import { Spacer } from "@heroui/react";

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
