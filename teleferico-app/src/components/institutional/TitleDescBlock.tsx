import { type ReactNode } from "react";

interface Props {
  title: string;
  align?: "center" | "start";
  epigraph?: string;
  desc?: ReactNode;
}

export default function TitleDescBlock(props: Props) {
  const { title, desc, epigraph, align = "center" } = props;

  const alignVariants = {
    center: "items-center text-center",
    start: "items-start text-start",
  };

  return (
    <div
      className={`flex max-w-[800px] flex-col ${alignVariants[align]} mx-auto mb-12 gap-5 px-10 py-2 md:px-16`}
    >
      {epigraph ? <p className="text-small text-primary">{epigraph}</p> : null}
      <h4 className="text-3xl font-bold capitalize text-inherit md:text-5xl">
        {title}
      </h4>
      {desc ? <p className="text-inherit">{desc}</p> : null}
    </div>
  );
}
