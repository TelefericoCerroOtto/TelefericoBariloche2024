import { type ReactNode } from "react";

interface Props {
  title: string;
  align?: "center" | "start";
  size?: "sm" | "md" | "lg";
  caseStyle?: "capitalize" | "uppercase" | "lowercase" | "normal";
  epigraph?: string;
  desc?: ReactNode;
  children?: ReactNode;
}

export function HighlightLastWord(text: string) {
  if (!text) return null;

  // Split the text's words
  const words = text.trim().split(" ");
  // Catches the last word
  const lastWord = words.pop();
  // Put the rest of the text together
  const remainingText = words.join(" ");

  return (
    <>
      {remainingText} {remainingText && " "}
      <span className="text-red-500">{lastWord}</span>
    </>
  );
}

export default function TitleDescBlock(props: Props) {
  const {
    title,
    desc,
    epigraph,
    children,
    align = "center",
    size = "md",
    caseStyle = "normal",
  } = props;

  const alignVariants = {
    center: "items-center text-center mx-auto",
    start: "items-start text-start",
  };

  const sizeVariants = {
    sm: "max-w-[600px]",
    md: "max-w-[800px]",
    lg: "max-w-[900px]",
  };

  const titleStyle = {
    capitalize: "capitalize",
    uppercase: "uppercase",
    lowercase: "lowercase",
    normal: "normal-case",
  };

  return (
    <div
      className={`flex flex-col ${sizeVariants[size]} ${alignVariants[align]} mb-12 gap-5`}
    >
      {epigraph ? <p className="text-small text-primary">{epigraph}</p> : null}
      <h4
        className={`${titleStyle[caseStyle]} text-3xl font-bold text-inherit md:text-4xl`}
      >
        {title}
      </h4>
      {desc ? <p className="text-inherit">{desc}</p> : null}
      {children ? <div className="flex gap-4">{children}</div> : null}
    </div>
  );
}
