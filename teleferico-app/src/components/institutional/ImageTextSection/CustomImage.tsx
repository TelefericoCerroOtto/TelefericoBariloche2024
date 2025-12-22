import type { Image } from "@/types";
import NextImage from "next/image";
import notFoundImg from "@/public/image-not-found.jpg";

interface Props {
  image: Image;
}

export default function CustomImage(props: Props) {
  const { image } = props;
  return (
    <NextImage
      src={image?.image?.url ?? notFoundImg.src}
      alt={image?.alt ?? "imagen de fondo gris"}
      fill
      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:transform-none"
    />
  );
}
