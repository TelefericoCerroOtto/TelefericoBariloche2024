import { BlockRendererClient } from "@/components";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import { type ReactNode } from "react";

interface Props {
  title: string;
  align?: "center" | "start";
  flexdir?: "col" | "row";
  size?: "sm" | "md" | "lg" | "full";
  caseStyle?: "capitalize" | "uppercase" | "lowercase" | "normal";
  epigraph?: string;
  desc?: ReactNode | BlocksContent;
  children?: ReactNode;
  className?: string;
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
    flexdir = "col",
    size = "md",
    caseStyle = "normal",
    className,
  } = props;

  const alignVariants = {
    center: "items-center text-center mx-auto",
    start: "items-start text-start",
  };

  const flexdirVariants = {
    col: "flex-col",
    row: "flex-row",
  };

  const sizeVariants = {
    sm: "max-w-[600px]",
    md: "max-w-[800px]",
    lg: "max-w-[900px]",
    full: "w-full",
  };

  const titleStyle = {
    capitalize: "capitalize",
    uppercase: "uppercase",
    lowercase: "lowercase",
    normal: "normal-case",
  };

  return (
    <div
      className={`flex gap-8 ${flexdirVariants[flexdir]} ${sizeVariants[size]} ${alignVariants[align]} ${className}`}
    >
      {epigraph ? <p className="text-small text-primary">{epigraph}</p> : null}
      <h3
        className={`${titleStyle[caseStyle]} text-3xl font-bold text-inherit md:text-4xl`}
      >
        {title}
      </h3>
      {desc && typeof desc === "string" ? (
        <p className="text-inherit">{desc}</p>
      ) : (
        <BlockRendererClient content={desc as BlocksContent} />
      )}
      {children ? <div className="flex gap-4">{children}</div> : null}
    </div>
  );
}
