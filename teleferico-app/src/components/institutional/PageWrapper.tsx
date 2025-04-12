import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function PageWrapper(props: Props) {
  const { children } = props;
  return (
    <div className="flex flex-col items-center justify-center">{children}</div>
  );
}
