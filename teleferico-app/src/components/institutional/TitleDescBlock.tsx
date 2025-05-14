import { BlockRendererClient } from "@/components";
import { bgStyles, caseStyles } from "@/utils/styles";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import { type ReactNode } from "react";

interface Props {
  title: string;
  align?: "center" | "start";
  flexdir?: "col" | "row";
  size?: "sm" | "md" | "lg" | "full";
  titleCase?: "capitalize" | "uppercase" | "lowercase" | "normal";
  bgColor?: "none" | "gray";
  epigraph?: string | null;
  desc?: ReactNode | BlocksContent;
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
    titleCase = "normal",
    desc,
    epigraph,
    children,
    align = "center",
    flexdir = "col",
    size = "md",
    bgColor = "none",
  } = props;

  const alignVariants = {
    center: "items-center text-center mx-auto",
    start: "items-start text-start",
  };

  const flexdirVariants = {
    col: "flex-col",
    row: "flex-col md:flex-row",
  };

  const sizeVariants = {
    sm: "max-w-[600px]",
    md: "max-w-[800px]",
    lg: "max-w-[900px] px-6 py-4",
    full: "w-full px-6 py-4 sm:px-16 sm:py-8 lg:px-36 lg:py-16",
  };

  return (
    <div
      className={`flex gap-4 ${flexdirVariants[flexdir]} ${sizeVariants[size]} ${alignVariants[align]} ${bgStyles[bgColor]}`}
    >
      {epigraph ? <p className="text-small text-primary">{epigraph}</p> : null}
      <h3
        className={`${caseStyles[titleCase]} text-3xl font-bold text-inherit md:text-4xl`}
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
