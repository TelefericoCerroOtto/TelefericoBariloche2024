import { CustomLink, TitleDescBlock } from "@/components";
import muniecodenieve from "@/public/muniecodenieve.jpg";
import { ROUTES } from "@/utils/routes.const";
import Image from "next/image";

export default function PosterSection() {
  const { ACTIVITIES } = ROUTES;

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
          <CustomLink href={ACTIVITIES}>Ver todas las Actividades</CustomLink>
        </div>
      </div>
      <div className="relative h-[550px] w-full">
        <Image
          src={muniecodenieve.src}
          alt="lago con persona apuntando"
          fill
          className="object-cover"
        />
      </div>
    </section>
  );
}
