import { Button, Image } from "@nextui-org/react";

interface Props {
  imageSrc: string;
  title: string;
  description: string;
}

export default function Poster(props: Props) {
  const { imageSrc, title, description } = props;
  return (
    <div className="relative flex w-5/6 items-center justify-between overflow-hidden rounded-lg bg-white p-6 shadow-lg">
      <Image
        removeWrapper
        src={imageSrc}
        alt={title}
        className="h-60 flex-1 rounded-lg object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-black opacity-50"></div>
      <div className="relative z-10 flex-1 text-center text-white">
        <h2 className="mb-2 text-2xl font-bold">{title}</h2>
        <p className="mb-4">{description}</p>
        <Button color="primary" variant="solid" size="lg">
          Ver más
        </Button>
      </div>
      <div className="absolute right-0 top-0 h-12 w-12 translate-x-4 translate-y-4 rotate-45 transform rounded-full bg-red-500"></div>
      <div className="absolute bottom-0 left-0 h-12 w-12 -translate-y-4 translate-x-4 -rotate-45 transform rounded-full bg-red-500"></div>
    </div>
  );
}
