export default function Section({
  children,
  className = "",
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <section className={`${className} my-7 flex w-5/6`}>{children}</section>
  );
}
