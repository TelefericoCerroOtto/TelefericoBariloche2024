import { Button, Image } from "@nextui-org/react";
import { Section } from "@/components";

interface Props {
  imageSrc: string;
  title: string;
  description: string;
}

export default function Poster(props: Props) {
  const { imageSrc, title, description } = props;
  return (
    <Section className="relative flex-col items-center justify-between overflow-hidden rounded-lg bg-white p-6 shadow-lg sm:flex-row">
      <Image
        removeWrapper
        src={imageSrc}
        radius="lg"
        alt={title}
        className="h-60 object-cover p-2 sm:w-1/2"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-black opacity-70"></div>
      <div className="relative z-10 p-2 text-center text-white sm:w-1/2">
        <h2 className="mb-2 text-2xl font-bold">{title}</h2>
        <p className="mb-4">{description}</p>
        <Button color="primary" variant="solid" size="lg">
          Ver más
        </Button>
      </div>
      <div className="absolute right-0 top-0 h-12 w-12 translate-x-4 translate-y-4 rotate-45 transform rounded-full bg-red-500"></div>
      <div className="absolute bottom-0 left-0 h-12 w-12 -translate-y-4 translate-x-4 -rotate-45 transform rounded-full bg-red-500"></div>
    </Section>
  );
}
