import { type ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  align?: "center" | "start";
  epigraph?: string;
  children?: ReactNode;
}

export default function InfoBlock(props: Props) {
  const { title, description, epigraph, children, align = "center" } = props;

  const alignVariants = {
    center: "items-center text-center",
    start: "items-start text-start",
  };

  return (
    <div
      className={`flex max-w-[800px] flex-col ${alignVariants[align]} gap-5 p-2`}
    >
      {epigraph ? <p className="text-small text-primary">{epigraph}</p> : null}
      <h4 className="text-3xl font-bold capitalize text-inherit md:text-5xl">
        {title}
      </h4>
      {description ? <p className="text-inherit">{description}</p> : null}
      {children}
    </div>
  );
}
