import Image from "next/image";
import { Button } from "@nextui-org/react";
import confiteria from "@/public/confiteria2.jpg";

export default function Hero() {
  return (
    <section className="flex h-screen min-h-96 w-screen items-center justify-center">
      <Image
        fill
        className="left-0 top-0 min-h-96 object-cover"
        alt="Confitera giratoria nevada"
        src={confiteria.src}
        quality={100}
      />
      <div className="absolute m-auto flex w-full items-center justify-center p-6 text-gray-400">
        <div className="flex h-full w-full flex-col items-center justify-between gap-3 sm:w-9/12">
          <h2 className="text-center text-2xl font-bold sm:text-4xl">
            Complejo Turístico Teleférico Cerro Otto
          </h2>
          <p className="text-center text-sm font-bold sm:text-base">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas iste
            mollitia magnam modi, natus consequuntur? Necessitatibus vel
            pariatur beatae facere.
          </p>
          <Button color="primary" size="lg" variant="solid">
            Conocer mas
          </Button>
        </div>
      </div>
    </section>
  );
}
