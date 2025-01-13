import { TitleDescBlock } from "@/components";
import Link from "next/link";
import { ROUTES } from "@/utils/routes.const";
import { buttonStyles } from "@/utils/styles";
import Image from "next/image";
import olaf from "@/public/muniecodenieve.jpg";

export default function PosterSection() {
  const { INFO } = ROUTES;

  return (
    <section className="mb-14 flex w-full flex-col">
      <div className="flex w-full flex-col items-stretch px-10 pb-14 lg:flex-row lg:px-32">
        <TitleDescBlock
          align="start"
          title="Actividades para Conectar con la Naturaleza"
          epigraph="Descubrí todo lo que el Cerro Otto tiene para ofrecerte"
          desc="En el Complejo Turístico Teleférico Cerro Otto, cada temporada ofrece propuestas únicas para disfrutar y redescubrir la belleza natural de Bariloche. Desde aventuras al aire libre hasta momentos de relajación, encontrá la actividad perfecta para vivir una experiencia inolvidable."
        />
        <div className="flex h-full w-full items-end justify-start lg:justify-end">
          <Link href={INFO} className={`${buttonStyles()} capitalize`}>
            Ver todas las Actividades
          </Link>
        </div>
      </div>
      <div className="relative h-[550px] w-full">
        <Image
          src={olaf.src}
          alt="lago con persona apuntando"
          fill
          className="object-cover"
        />
      </div>
    </section>
  );
}
