import Image from "next/image";
import { Button } from "@nextui-org/react";
import confiteria from "@/public/confiteria2.jpg";

export default function Hero() {
  return (
    <section className="mb-6 h-screen w-screen">
      <div>
        <Image
          fill
          className="left-0 top-0 object-cover sm:object-cover"
          alt="NextUI hero Image"
          src={confiteria.src}
          quality={100}
        />
        <div className="absolute mt-16 flex h-1/2 w-full items-center justify-center p-6 text-slate-950">
          <div className="flex h-full w-full flex-col items-center justify-between sm:w-9/12">
            <h2 className="mb-4 text-center text-2xl font-bold sm:text-4xl">
              Complejo Turístico Teleférico Cerro Otto
            </h2>
            <p className="text-center text-tiny font-bold sm:text-base">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas iste
              mollitia magnam modi, natus consequuntur? Necessitatibus vel
              pariatur beatae facere.
            </p>
            <Button color="primary" size="lg" variant="solid">
              Conocer mas
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
