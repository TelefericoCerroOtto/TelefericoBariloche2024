import { ImageType } from "@/types/api";
import Image from "next/image";

interface Props {
  image: ImageType;
  title: string;
  description: string;
  isInverted?: boolean;
  isTitleHighlighted?: boolean;
}

function HighlightLastWord(text: string) {
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

export default function ImageTextBlock(props: Props) {
  const {
    image,
    title,
    description,
    isInverted = false,
    isTitleHighlighted = false,
  } = props;

  return (
    <div
      className={`flex flex-col ${isInverted ? "lg:flex-row-reverse" : "lg:flex-row"} w-full items-center justify-center`}
    >
      <div className="relative h-[500px] w-full lg:h-[700px] lg:w-1/2">
        <Image src={image.src} alt={image?.alt} fill className="object-cover" />
      </div>
      <div
        className={`flex w-full flex-col items-center ps-0 md:items-start md:ps-12 lg:w-1/2 ${isInverted ? "lg:items-center" : "lg:items-start lg:px-12"}`}
      >
        <div className={`w-3/4 ${isInverted ? "lg:w-1/2" : ""} py-20`}>
          <h4 className="mb-4 text-center text-3xl font-bold uppercase text-inherit md:text-start md:text-5xl">
            {isTitleHighlighted ? HighlightLastWord(title) : title}
          </h4>
          <p className="text-center md:text-start">{description}</p>
        </div>
      </div>
    </div>
  );
}
